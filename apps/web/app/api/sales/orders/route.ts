import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listSOs, createSO } from '../../../../lib/sales'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as any
  const orders = await listSOs(ctx.tenant.id, status ? { status } : {})
  return NextResponse.json(orders)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json()
  const res = await createSO({
    tenantId:     ctx.tenant.id,
    userId:       ctx.session.user.id,
    contactId:    body.contactId ?? null,
    customerName: body.customerName,
    date:         body.date,
    expiryDate:   body.expiryDate ?? null,
    notes:        body.notes ?? null,
    lines:        body.lines ?? [],
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.so, { status: 201 })
}
