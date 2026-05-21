import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listDeals, createDeal } from '../../../../lib/crm'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage') as any
  const list = await listDeals(ctx.tenant.id, stage ? { stage } : {})
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json()
  const res = await createDeal({
    tenantId:      ctx.tenant.id,
    userId:        ctx.session.user.id,
    title:         body.title,
    contactId:     body.contactId ?? null,
    contactName:   body.contactName ?? null,
    expectedValue: body.expectedValue ?? 0,
    expectedClose: body.expectedClose ?? null,
    notes:         body.notes ?? null,
    stage:         body.stage ?? 'lead',
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.deal, { status: 201 })
}
