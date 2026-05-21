import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listPromotions, createPromotion } from '../../../../lib/promotions'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as 'active' | 'inactive' | 'archived' | null
  const search = searchParams.get('search') ?? undefined

  const rows = await listPromotions(ctx.tenant.id, { status: status ?? undefined, search })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, discountType, discountConfig, conditions, customFormula, status, validFrom, validTo, priority } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Nama diperlukan.' }, { status: 400 })

  const promo = await createPromotion(ctx.tenant.id, {
    name: name.trim(),
    description: description?.trim() || null,
    discountType: discountType ?? 'percentage',
    discountConfig: discountConfig ?? {},
    conditions: conditions ?? {},
    customFormula: customFormula?.trim() || null,
    status: status ?? 'inactive',
    validFrom: validFrom || null,
    validTo: validTo || null,
    priority: priority ?? 0,
    createdBy: ctx.session.user.id,
  })

  return NextResponse.json(promo, { status: 201 })
}
