import { NextResponse } from 'next/server'
import { signUp } from '../../../../lib/auth'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { email, name, password, workspaceName, workspaceSlug } = body as Record<string, unknown>
  if (
    typeof email !== 'string' ||
    typeof name !== 'string' ||
    typeof password !== 'string' ||
    typeof workspaceName !== 'string' ||
    typeof workspaceSlug !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const result = await signUp({ email, name, password, workspaceName, workspaceSlug })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
