import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listArticles, createArticle } from '../../../../lib/kms'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const spaceId = searchParams.get('spaceId') ?? undefined
  const search = searchParams.get('search') ?? undefined
  const status = searchParams.get('status') as import('@kantorcore/db').ArticleStatus | null

  const articles = await listArticles(ctx.tenant.id, {
    spaceId,
    search,
    status: status ?? undefined,
  })
  return NextResponse.json(articles)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json()
  const { spaceId, title, content, parentId, visibility, tags, slug } = body

  if (!spaceId) return NextResponse.json({ error: 'Space diperlukan.' }, { status: 400 })
  if (!title?.trim()) return NextResponse.json({ error: 'Judul diperlukan.' }, { status: 400 })

  const article = await createArticle(ctx.tenant.id, {
    spaceId,
    title: title.trim(),
    body: content ?? '',
    parentId: parentId || null,
    visibility: visibility ?? 'internal',
    tags: Array.isArray(tags) ? tags : [],
    slug: slug?.trim() || undefined,
    authorId: ctx.session.user.id,
  })
  return NextResponse.json(article, { status: 201 })
}
