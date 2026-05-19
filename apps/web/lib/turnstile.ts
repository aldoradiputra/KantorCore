import 'server-only'

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Returns true when:
 *   - TURNSTILE_SECRET_KEY is not configured (dev mode / Turnstile disabled)
 *   - The token is valid according to Cloudflare's siteverify API
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as TurnstileResponse
  return data.success === true
}
