import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { listViews, createView } from '../../../../../../lib/platform/views'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const list = await listViews(ctx.tenant.id, decodeURIComponent(key))
  return NextResponse.json({ views: list })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const r = await createView({
    tenantId: ctx.tenant.id,
    modelKey: decodeURIComponent(key),
    name: String(body.name ?? ''),
    columns: Array.isArray(body.columns) ? body.columns.map(String) : undefined,
    filters: Array.isArray(body.filters) ? body.filters : undefined,
    sorts: Array.isArray(body.sorts) ? body.sorts : undefined,
    isDefault: !!body.isDefault,
    isShared: body.isShared !== false,
    createdBy: ctx.session.user.id,
  })

  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json({ view: r.view }, { status: 201 })
}
