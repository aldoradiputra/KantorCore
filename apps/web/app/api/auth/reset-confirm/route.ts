import { NextResponse } from 'next/server'
import { consumePasswordResetToken } from '../../../../lib/password-reset'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.token !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Missing token or password.' }, { status: 400 })
  }

  const result = await consumePasswordResetToken(body.token, body.password)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
