import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listPOs, createPO } from '../../../../lib/procurement'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as any
  const orders = await listPOs(ctx.tenant.id, status ? { status } : {})
  return NextResponse.json(orders)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json()
  const res = await createPO({
    tenantId:     ctx.tenant.id,
    userId:       ctx.session.user.id,
    contactId:    body.contactId ?? null,
    vendorName:   body.vendorName,
    date:         body.date,
    expectedDate: body.expectedDate ?? null,
    notes:        body.notes ?? null,
    lines:        body.lines ?? [],
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.po, { status: 201 })
}
