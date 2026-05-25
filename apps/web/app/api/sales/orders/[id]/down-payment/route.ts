import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { createDownPaymentInvoice } from '../../../../../../lib/sales-advanced'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id: soId } = await params

  const body = await req.json().catch(() => null)
  if (!body || (body.pct === undefined && body.amount === undefined)) {
    return NextResponse.json({ error: 'Tentukan persentase atau nominal DP.' }, { status: 400 })
  }

  const res = await createDownPaymentInvoice({
    tenantId: ctx.tenant.id,
    userId:   ctx.session.user.id,
    soId,
    pct:      body.pct,
    amount:   body.amount,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ invoiceId: res.invoiceId, amount: res.amount }, { status: 201 })
}
