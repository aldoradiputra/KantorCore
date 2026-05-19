import { NextResponse } from 'next/server'
import { createPasswordResetToken } from '../../../../lib/password-reset'
import { verifyTurnstile } from '../../../../lib/turnstile'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Missing email.' }, { status: 400 })
  }

  const turnstileOk = await verifyTurnstile(typeof body.cfTurnstileToken === 'string' ? body.cfTurnstileToken : undefined)
  if (!turnstileOk) return NextResponse.json({ error: 'Verifikasi keamanan gagal. Muat ulang halaman dan coba lagi.' }, { status: 400 })

  const result = await createPasswordResetToken(body.email)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  // In dev, return the token directly so it can be tested without an email server.
  // In production this would enqueue an email via IS-EMAIL (Phase 2).
  const isDev = process.env.NODE_ENV !== 'production'
  return NextResponse.json({
    ok: true,
    ...(isDev && { resetToken: result.token }),
  })
}
