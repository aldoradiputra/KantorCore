import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listProcesses } from '../../../lib/processes'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const processes = await listProcesses(ctx.tenant.id)
  return NextResponse.json({ processes })
}
