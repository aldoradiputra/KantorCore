import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listOnHand, adjustStock } from '../../../../lib/inventory'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const url = new URL(req.url)
  const productId  = url.searchParams.get('productId')  ?? undefined
  const locationId = url.searchParams.get('locationId') ?? undefined
  const internalOnly = url.searchParams.get('internalOnly') !== 'false'
  const rows = await listOnHand(ctx.tenant.id, { productId, locationId, internalOnly })
  return NextResponse.json({ stock: rows })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body || typeof body.productId !== 'string' || typeof body.locationId !== 'string' || typeof body.newQty !== 'number') {
    return NextResponse.json({ error: 'productId, locationId, dan newQty wajib diisi.' }, { status: 400 })
  }

  const res = await adjustStock({
    tenantId:   ctx.tenant.id,
    productId:  body.productId,
    locationId: body.locationId,
    newQty:     body.newQty,
    reference:  typeof body.reference === 'string' ? body.reference : undefined,
    notes:      typeof body.notes === 'string' ? body.notes : undefined,
    userId:     ctx.session.user.id,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ move: res.move, delta: res.delta })
}
