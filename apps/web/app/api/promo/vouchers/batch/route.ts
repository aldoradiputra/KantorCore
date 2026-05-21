import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { batchCreateVouchers } from '../../../../../lib/promotions'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { count, promotionId, discountOverridePct, discountOverrideAmt, maxUses, validFrom, validTo, notes } = body

  const n = Math.min(Math.max(1, Number(count) || 1), 500)

  const vouchers = await batchCreateVouchers(
    ctx.tenant.id,
    {
      voucherType: 'code',
      promotionId: promotionId || null,
      discountOverridePct: discountOverridePct ?? null,
      discountOverrideAmt: discountOverrideAmt ?? null,
      maxUses: maxUses ?? null,
      validFrom: validFrom || null,
      validTo: validTo || null,
      notes: notes?.trim() || null,
      createdBy: ctx.session.user.id,
    },
    n,
  )

  return NextResponse.json({ count: vouchers.length, vouchers }, { status: 201 })
}
