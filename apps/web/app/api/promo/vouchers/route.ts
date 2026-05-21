import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listVouchers, createVoucher } from '../../../../lib/promotions'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as 'code' | 'gift_card' | null
  const contactId = searchParams.get('contactId') ?? undefined
  const search = searchParams.get('search') ?? undefined

  const rows = await listVouchers(ctx.tenant.id, { type: type ?? undefined, contactId, search })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { code, voucherType, promotionId, discountOverridePct, discountOverrideAmt, contactId, maxUses, validFrom, validTo, notes, initialBalance } = body

  if (!code?.trim()) return NextResponse.json({ error: 'Kode diperlukan.' }, { status: 400 })

  const voucher = await createVoucher(ctx.tenant.id, {
    code,
    voucherType: voucherType ?? 'code',
    promotionId: promotionId || null,
    discountOverridePct: discountOverridePct ?? null,
    discountOverrideAmt: discountOverrideAmt ?? null,
    contactId: contactId || null,
    maxUses: maxUses ?? null,
    validFrom: validFrom || null,
    validTo: validTo || null,
    notes: notes?.trim() || null,
    initialBalance: initialBalance ?? null,
    balance: initialBalance ?? null,
    createdBy: ctx.session.user.id,
  })

  return NextResponse.json(voucher, { status: 201 })
}
