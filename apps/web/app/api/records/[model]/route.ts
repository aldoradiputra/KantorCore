import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listRecords, createRecord } from '../../../../lib/platform/records'
import { getModel } from '../../../../lib/platform/registry'

export async function GET(req: Request, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const def = await getModel(decodeURIComponent(model), ctx.tenant.id)
  if (!def) return NextResponse.json({ error: 'Unknown model.' }, { status: 404 })

  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? 100)
  const offset = Number(url.searchParams.get('offset') ?? 0)

  try {
    const rows = await listRecords(ctx.tenant.id, def.model.key, { limit, offset })
    return NextResponse.json({ model: def.model.key, rows })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const def = await getModel(decodeURIComponent(model), ctx.tenant.id)
  if (!def) return NextResponse.json({ error: 'Unknown model.' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  try {
    const row = await createRecord({
      tenantId: ctx.tenant.id,
      modelKey: def.model.key,
      actorUserId: ctx.session.user.id,
      values: body.values ?? {},
      custom: body.custom,
    })
    return NextResponse.json({ record: row })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
