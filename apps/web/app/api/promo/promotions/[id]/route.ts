import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import {
  getPromotion,
  updatePromotion,
  deletePromotion,
  listPromotionUses,
} from '../../../../../lib/promotions'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const { searchParams } = new URL(req.url)
  if (searchParams.get('uses') === '1') {
    const uses = await listPromotionUses(ctx.tenant.id, { promotionId: id })
    return NextResponse.json(uses)
  }

  const promo = await getPromotion(ctx.tenant.id, id)
  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(promo)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const promo = await updatePromotion(ctx.tenant.id, id, body)
  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(promo)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await deletePromotion(ctx.tenant.id, id)
  return new NextResponse(null, { status: 204 })
}
