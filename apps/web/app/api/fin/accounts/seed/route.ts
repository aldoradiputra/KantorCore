import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { seedDefaultAccounts } from '../../../../../lib/finance'

export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const inserted = await seedDefaultAccounts(ctx.tenant.id)
  return NextResponse.json({ ok: true, inserted })
}
