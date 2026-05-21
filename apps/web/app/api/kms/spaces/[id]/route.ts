import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getSpace, updateSpace } from '../../../../../lib/kms'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const space = await getSpace(ctx.tenant.id, id)
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(space)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  const space = await updateSpace(ctx.tenant.id, id, body)
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(space)
}
