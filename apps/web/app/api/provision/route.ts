import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../lib/auth'
import { provisionTenant } from '../../../lib/tenants'

/**
 * Creates an additional workspace for the currently signed-in user. The
 * first workspace is created atomically as part of sign-up; this endpoint
 * exists for users who already have an account and want to spin up another
 * workspace (e.g. consultants managing several clients).
 */
export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { name, slug } = body as Record<string, unknown>
  if (typeof name !== 'string' || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const result = await provisionTenant({ userId: session.user.id, name, slug })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, tenant: result.tenant })
}
