import { NextResponse } from 'next/server'
import { signUp } from '../../../../lib/auth'
import { verifyTurnstile } from '../../../../lib/turnstile'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { email, name, password, workspaceName, workspaceSlug, cfTurnstileToken } = body as Record<string, unknown>
  if (
    typeof email !== 'string' ||
    typeof name !== 'string' ||
    typeof password !== 'string' ||
    typeof workspaceName !== 'string' ||
    typeof workspaceSlug !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const turnstileOk = await verifyTurnstile(typeof cfTurnstileToken === 'string' ? cfTurnstileToken : undefined)
  if (!turnstileOk) return NextResponse.json({ error: 'Verifikasi keamanan gagal. Muat ulang halaman dan coba lagi.' }, { status: 400 })

  const result = await signUp({ email, name, password, workspaceName, workspaceSlug })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
