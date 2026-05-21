import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listSpaces, createSpace } from '../../../../lib/kms'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const spaces = await listSpaces(ctx.tenant.id)
  return NextResponse.json(spaces)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json()
  const { name, description, icon, visibility, slug } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Nama diperlukan.' }, { status: 400 })

  const space = await createSpace(ctx.tenant.id, {
    name: name.trim(),
    description: description?.trim() || null,
    icon: icon || null,
    visibility: visibility ?? 'internal',
    slug: slug?.trim() || undefined,
    createdBy: ctx.session.user.id,
  })
  return NextResponse.json(space, { status: 201 })
}
