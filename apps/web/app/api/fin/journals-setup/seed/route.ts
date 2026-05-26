import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { seedDefaultJournals } from '../../../../../lib/finance-journals'

export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  const seeded = await seedDefaultJournals(ctx.tenant.id, session.user.id)
  return NextResponse.json({ seeded })
}
