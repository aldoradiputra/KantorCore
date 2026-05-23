import { eq, and } from 'drizzle-orm'
import { agents, agentRuns, mandates, tools } from '@kantorcore/db'
import { getDb, withTenant } from './db'
import {
  createMessage,
  type AnthropicMessage,
  type ContentBlock,
  type MessageParam,
  type ToolParam,
  type ToolResultBlockParam,
  type ToolUseBlock,
} from './anthropic'
import { dispatchTool, type ToolDispatchContext } from './tool-dispatcher'

const MAX_ITERATIONS = 12
const MAX_TOKENS = 4096

export interface ToolCallEvent {
  id: string
  toolName: string
  input: Record<string, unknown>
  output?: unknown
  error?: string
  requiresApproval: boolean
  startedAt: string
  completedAt?: string
}


async function patchRun(
  runId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await getDb()
    .update(agentRuns)
    .set(patch as never)
    .where(eq(agentRuns.id, runId))
}

function buildSystemPrompt(agentName: string, tenantName: string, customPrompt: string | null): string {
  const base = `You are ${agentName}, an AI assistant for the ${tenantName} workspace on KantorCore — Indonesia's enterprise operating system.`
  if (customPrompt) return `${base}\n\n${customPrompt}`
  return base
}

/**
 * Executes an agent run to completion (or pauses at awaiting_approval).
 * Updates the run record in-place as execution progresses.
 * Safe to call multiple times for resume after approval.
 */
export async function executeRun(runId: string): Promise<void> {
  const db = getDb()

  // Load run
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1)

  if (!run) throw new Error(`Run ${runId} not found`)
  if (run.status !== 'pending' && run.status !== 'approved') return

  const tenantId = run.tenantId
  const agentId = run.agentId

  // Load agent
  const agentRows = await withTenant(tenantId, (tx) =>
    tx.select().from(agents).where(and(eq(agents.tenantId, tenantId), eq(agents.id, agentId))).limit(1),
  )
  const agentDef = agentRows[0]
  if (!agentDef) {
    await patchRun(runId, { status: 'failed', error: 'Agen tidak ditemukan.', completedAt: new Date() })
    return
  }
  if (!agentDef.enabled) {
    await patchRun(runId, { status: 'failed', error: 'Agen dinonaktifkan.', completedAt: new Date() })
    return
  }

  // Load mandates → tool names
  const mandateRows = await withTenant(tenantId, (tx) =>
    tx.select().from(mandates).where(and(eq(mandates.tenantId, tenantId), eq(mandates.agentId, agentId))),
  )
  const grantedToolNames = new Set(mandateRows.map((m) => m.toolName))

  if (grantedToolNames.size === 0) {
    await patchRun(runId, {
      status: 'failed',
      error: 'Agen tidak memiliki mandat. Tambahkan mandat tool terlebih dahulu.',
      completedAt: new Date(),
    })
    return
  }

  // Load tool definitions for granted tools
  const toolRows = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(tools)
      .where(and(eq(tools.tenantId, tenantId), eq(tools.enabled, true))),
  )
  const grantedTools = toolRows.filter((t) => grantedToolNames.has(t.name))

  // Build Anthropic tool definitions with prompt caching on the last tool
  const toolDefs: ToolParam[] = grantedTools.map((t, idx) => {
    const def: ToolParam = {
      name: t.name.replace('.', '__'),  // Anthropic tool names: no dots
      description: t.description ?? t.name,
      input_schema: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>,
    }
    if (idx === grantedTools.length - 1) {
      def.cache_control = { type: 'ephemeral' }
    }
    return def
  })

  // Restore or initialize message history
  const input = run.input as Record<string, unknown>
  let messages: MessageParam[] = run.pendingMessages
    ? (run.pendingMessages as MessageParam[])
    : [{ role: 'user', content: String(input['prompt'] ?? '') }]

  // If resuming from approved — inject the tool result
  if (run.status === 'approved' && run.pendingToolCallId) {
    const pendingToolCall = (run.toolCalls as ToolCallEvent[]).find(
      (tc) => tc.id === run.pendingToolCallId,
    )
    if (pendingToolCall) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: run.pendingToolCallId,
            content: JSON.stringify(pendingToolCall.output ?? { approved: true }),
          },
        ],
      })
    }
  }

  // Mark running
  await patchRun(runId, {
    status: 'running',
    startedAt: run.startedAt ?? new Date(),
    pendingToolCallId: null,
    pendingMessages: null,
  })

  const systemPrompt = buildSystemPrompt(agentDef.name, tenantId, agentDef.systemPrompt)
  const toolCallHistory: ToolCallEvent[] = (run.toolCalls as ToolCallEvent[]) ?? []
  const ctx: ToolDispatchContext = { tenantId, actorUserId: run.createdBy ?? '' }

  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let response: AnthropicMessage
    try {
      response = await createMessage({
        model: agentDef.model,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: toolDefs,
        messages,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await patchRun(runId, { status: 'failed', error: msg, completedAt: new Date() })
      return
    }

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    // Append assistant turn
    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      // Extract text output
      const textBlock = response.content.find((b: ContentBlock) => b.type === 'text')
      const outputText = textBlock?.type === 'text' ? textBlock.text : null

      await patchRun(runId, {
        status: 'done',
        output: { text: outputText, toolCalls: toolCallHistory },
        toolCalls: toolCallHistory,
        inputTokens: String(totalInputTokens),
        outputTokens: String(totalOutputTokens),
        completedAt: new Date(),
      })
      return
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b: ContentBlock): b is ToolUseBlock => b.type === 'tool_use',
      )
      const toolResults: ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        // Map back from __ to . in tool name
        const toolName = block.name.replace('__', '.')

        // Check mandate
        if (!grantedToolNames.has(toolName)) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool "${toolName}" tidak diizinkan — tidak ada mandat.`,
          })
          continue
        }

        // Check if this mandate has requireApproval scope
        const mandate = mandateRows.find((m) => m.toolName === toolName)
        const scope = mandate?.scope as Record<string, unknown> | null
        const requiresApproval = scope?.requireApproval === true

        const event: ToolCallEvent = {
          id: block.id,
          toolName,
          input: block.input as Record<string, unknown>,
          requiresApproval,
          startedAt: new Date().toISOString(),
        }

        if (requiresApproval) {
          // Pause execution — store state for resume
          toolCallHistory.push(event)
          await patchRun(runId, {
            status: 'awaiting_approval',
            toolCalls: toolCallHistory,
            pendingMessages: messages,
            pendingToolCallId: block.id,
            inputTokens: String(totalInputTokens),
            outputTokens: String(totalOutputTokens),
          })
          return
        }

        // Dispatch the tool
        const result = await dispatchTool(toolName, ctx, block.input as Record<string, unknown>)

        event.output = result.ok ? result.result : { error: result.error }
        event.error = result.ok ? undefined : result.error
        event.completedAt = new Date().toISOString()
        toolCallHistory.push(event)

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.ok ? JSON.stringify(result.result) : `Error: ${result.error}`,
        })
      }

      messages.push({ role: 'user', content: toolResults })

      // Persist tool call history after each iteration
      await patchRun(runId, {
        toolCalls: toolCallHistory,
        inputTokens: String(totalInputTokens),
        outputTokens: String(totalOutputTokens),
      })
      continue
    }

    // Unexpected stop reason
    break
  }

  await patchRun(runId, {
    status: 'failed',
    error: `Agen melewati batas iterasi (${MAX_ITERATIONS}). Coba pecah tugas menjadi langkah lebih kecil.`,
    toolCalls: toolCallHistory,
    completedAt: new Date(),
  })
}
