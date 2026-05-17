import 'server-only'
import { NextResponse } from 'next/server'
import { getCurrentSession } from './auth'
import { getCurrentTenant } from './tenants'
import type { SessionWithUser } from '@kantr/auth/server'
import type { Tenant, Membership } from '@kantr/db'

export interface AuthedContext {
  session: SessionWithUser
  tenant: Tenant
  membership: Membership
}

/**
 * Resolves the current user + tenant for an API route. Returns either the
 * authed context (call site continues) or a NextResponse error (call site
 * returns it directly).
 */
export async function requireAuthedContext(): Promise<
  { ok: true; ctx: AuthedContext } | { ok: false; response: NextResponse }
> {
  const session = await getCurrentSession()
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No workspace.' }, { status: 403 }),
    }
  }
  return {
    ok: true,
    ctx: { session, tenant: ctx.tenant, membership: ctx.membership },
  }
}
