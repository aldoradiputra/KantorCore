import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listCategories, createCategory } from '../../../../lib/products'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const categories = await listCategories(ctx.tenant.id)
  return NextResponse.json({ categories })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 })
  }
  const category = await createCategory(ctx.tenant.id, body.name, body.description ?? null)
  return NextResponse.json({ category }, { status: 201 })
}
