import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { reconcileRecord } from '../../../../../lib/finance-recon'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  const { record_id, journal_entry_id } = await req.json()
  if (!record_id || !journal_entry_id) return NextResponse.json({ error: 'record_id and journal_entry_id required' }, { status: 400 })
  const result = await reconcileRecord(ctx.tenant.id, record_id, journal_entry_id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}
