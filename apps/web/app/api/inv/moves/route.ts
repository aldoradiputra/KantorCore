import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listMoves, createMove } from '../../../../lib/inventory'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const url = new URL(req.url)
  const productId  = url.searchParams.get('productId')  ?? undefined
  const locationId = url.searchParams.get('locationId') ?? undefined
  const moves = await listMoves(ctx.tenant.id, { productId, locationId })
  return NextResponse.json({ moves })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body || !body.productId || !body.fromLocationId || !body.toLocationId || typeof body.qty !== 'number') {
    return NextResponse.json({ error: 'productId, fromLocationId, toLocationId, dan qty wajib diisi.' }, { status: 400 })
  }

  const res = await createMove({
    tenantId:       ctx.tenant.id,
    productId:      body.productId,
    fromLocationId: body.fromLocationId,
    toLocationId:   body.toLocationId,
    qty:            body.qty,
    reference:      typeof body.reference === 'string' ? body.reference : undefined,
    notes:          typeof body.notes === 'string' ? body.notes : undefined,
    userId:         ctx.session.user.id,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ move: res.move }, { status: 201 })
}
