import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listProducts, createProduct } from '../../../../lib/products'
import type { ProductTypeValue } from '../../../../lib/products'

const TYPES: ProductTypeValue[] = ['product', 'service', 'consumable']

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? undefined
  const activeOnly = url.searchParams.get('activeOnly') !== 'false'
  const rows = await listProducts(ctx.tenant.id, { search, activeOnly })
  return NextResponse.json({ products: rows })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Nama produk wajib diisi.' }, { status: 400 })
  }

  const res = await createProduct(ctx.tenant.id, {
    code: typeof body.code === 'string' ? body.code : null,
    name: body.name,
    description: typeof body.description === 'string' ? body.description : null,
    type: TYPES.includes(body.type) ? body.type : 'product',
    categoryId: typeof body.categoryId === 'string' ? body.categoryId : null,
    uomId: typeof body.uomId === 'string' ? body.uomId : null,
    salePrice: typeof body.salePrice === 'number' ? body.salePrice : 0,
    costPrice: typeof body.costPrice === 'number' ? body.costPrice : 0,
    revenueAccountId: typeof body.revenueAccountId === 'string' ? body.revenueAccountId : null,
    expenseAccountId: typeof body.expenseAccountId === 'string' ? body.expenseAccountId : null,
    defaultSaleTaxIds: Array.isArray(body.defaultSaleTaxIds) ? body.defaultSaleTaxIds : [],
    defaultPurchaseTaxIds: Array.isArray(body.defaultPurchaseTaxIds) ? body.defaultPurchaseTaxIds : [],
    notes: typeof body.notes === 'string' ? body.notes : null,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ product: res.product }, { status: 201 })
}
