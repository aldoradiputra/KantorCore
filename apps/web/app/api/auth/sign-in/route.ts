import { NextResponse } from 'next/server'
import { signIn } from '../../../../lib/auth'
import { verifyTurnstile } from '../../../../lib/turnstile'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { email, password, cfTurnstileToken } = body as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const turnstileOk = await verifyTurnstile(typeof cfTurnstileToken === 'string' ? cfTurnstileToken : undefined)
  if (!turnstileOk) return NextResponse.json({ error: 'Verifikasi keamanan gagal. Muat ulang halaman dan coba lagi.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const result = await signIn({ email, password, meta: { ip, userAgent } })

  if (!result.ok && 'totpRequired' in result) {
    return NextResponse.json(
      { totpRequired: true, challengeToken: result.challengeToken },
      { status: 202 },
    )
  }
  if (!result.ok) return NextResponse.json({ error: (result as { error: string }).error }, { status: 401 })
  return NextResponse.json({ ok: true })
}
