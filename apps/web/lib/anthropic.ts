import 'server-only'

const ANTHROPIC_VERSION = '2023-06-01'

function baseUrl(): string {
  return process.env.CLOUDFLARE_AI_GATEWAY_URL || 'https://api.anthropic.com'
}

function apiHeaders(): Record<string, string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  }
}

export interface TextBlock { type: 'text'; text: string }
export interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: unknown }
export interface ToolResultBlockParam {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}
export type ContentBlock = TextBlock | ToolUseBlock
export type ContentBlockParam = TextBlock | ToolUseBlock | ToolResultBlockParam

export interface MessageParam {
  role: 'user' | 'assistant'
  content: string | ContentBlockParam[]
}

export interface TextBlockParam {
  type: 'text'
  text: string
  cache_control?: { type: string }
}

export interface ToolParam {
  name: string
  description?: string
  input_schema: Record<string, unknown>
  cache_control?: { type: string }
}

export interface AnthropicMessage {
  id: string
  role: 'assistant'
  model: string
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | string | null
  usage: { input_tokens: number; output_tokens: number }
}

export interface MessageCreateParams {
  model: string
  max_tokens: number
  system?: string | TextBlockParam[]
  tools?: ToolParam[]
  messages: MessageParam[]
}

export async function createMessage(params: MessageCreateParams): Promise<AnthropicMessage> {
  const res = await fetch(`${baseUrl()}/v1/messages`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as AnthropicMessage
}

export type StreamEvent =
  | { type: 'content_block_delta'; index: number; delta: { type: 'text_delta'; text: string } | { type: string } }
  | { type: 'message_stop' }
  | { type: string; [key: string]: unknown }

export async function* streamMessage(
  params: MessageCreateParams,
): AsyncGenerator<StreamEvent, void, unknown> {
  const res = await fetch(`${baseUrl()}/v1/messages`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ ...params, stream: true }),
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${text || res.statusText}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        yield JSON.parse(data) as StreamEvent
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}
