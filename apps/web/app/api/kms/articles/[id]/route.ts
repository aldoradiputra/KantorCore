import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getArticle, updateArticle, deleteArticle, listVersions } from '../../../../../lib/kms'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const { searchParams } = new URL(req.url)
  if (searchParams.get('versions') === '1') {
    const versions = await listVersions(ctx.tenant.id, id)
    return NextResponse.json(versions)
  }

  const article = await getArticle(ctx.tenant.id, id)
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(article)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  // Map "content" → body field
  if (body.content !== undefined) {
    body.body = body.content
    delete body.content
  }
  const article = await updateArticle(ctx.tenant.id, id, {
    ...body,
    snapshot: body.snapshot ?? true,
    authorId: ctx.session.user.id,
  })
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(article)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await deleteArticle(ctx.tenant.id, id)
  return new NextResponse(null, { status: 204 })
}
