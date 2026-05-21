import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { updateProduct, archiveProduct } from '../../../../../lib/products'
import type { ProductTypeValue } from '../../../../../lib/products'

const TYPES: ProductTypeValue[] = ['product', 'service', 'consumable']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const res = await updateProduct(ctx.tenant.id, id, {
    code: body.code === null ? null : typeof body.code === 'string' ? body.code : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    description: body.description === null ? null : typeof body.description === 'string' ? body.description : undefined,
    type: TYPES.includes(body.type) ? body.type : undefined,
    categoryId: body.categoryId === null ? null : typeof body.categoryId === 'string' ? body.categoryId : undefined,
    uomId: body.uomId === null ? null : typeof body.uomId === 'string' ? body.uomId : undefined,
    salePrice: typeof body.salePrice === 'number' ? body.salePrice : undefined,
    costPrice: typeof body.costPrice === 'number' ? body.costPrice : undefined,
    revenueAccountId: body.revenueAccountId === null ? null : typeof body.revenueAccountId === 'string' ? body.revenueAccountId : undefined,
    expenseAccountId: body.expenseAccountId === null ? null : typeof body.expenseAccountId === 'string' ? body.expenseAccountId : undefined,
    defaultSaleTaxIds: Array.isArray(body.defaultSaleTaxIds) ? body.defaultSaleTaxIds : undefined,
    defaultPurchaseTaxIds: Array.isArray(body.defaultPurchaseTaxIds) ? body.defaultPurchaseTaxIds : undefined,
    notes: body.notes === null ? null : typeof body.notes === 'string' ? body.notes : undefined,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ product: res.product })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  await archiveProduct(ctx.tenant.id, id)
  return NextResponse.json({ ok: true })
}
