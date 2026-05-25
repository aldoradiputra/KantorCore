import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { updateLeadStatus } from '../../../../../lib/crm-teams'
import type { LeadStatus } from '../../../../../lib/crm-teams'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body?.status) return NextResponse.json({ error: 'Status wajib diisi.' }, { status: 400 })

  const res = await updateLeadStatus(ctx.tenant.id, id, body.status as LeadStatus)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ lead: res.lead })
}
