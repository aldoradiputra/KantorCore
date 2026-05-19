import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { seedDefaultProcesses } from '../../../../lib/processes'

/**
 * Re-seed (or upgrade) system process templates for the current tenant.
 * New tenants are seeded automatically in `provisionTenant`; this endpoint
 * exists for older tenants and for manifest upgrades.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const changed = await seedDefaultProcesses(ctx.tenant.id)
  return NextResponse.json({ ok: true, changed })
}
