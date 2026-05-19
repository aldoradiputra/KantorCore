import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      // Route through Cloudflare AI Gateway when configured; falls back to
      // direct Anthropic API when env var is absent (local dev, CI).
      ...(process.env.CLOUDFLARE_AI_GATEWAY_URL && {
        baseURL: process.env.CLOUDFLARE_AI_GATEWAY_URL,
      }),
    })
  }
  return _client
}
