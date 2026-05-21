import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { runImport, listImportJobs, type ImportEntity } from '../../../../lib/migration'

const VALID_ENTITIES: ImportEntity[] = ['contacts', 'vendors', 'products', 'accounts']
const MAX_ROWS = 500

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const jobs = await listImportJobs(ctx.tenant.id)
  return NextResponse.json(jobs)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body || !VALID_ENTITIES.includes(body.entity)) {
    return NextResponse.json({ error: 'Entity tidak valid.' }, { status: 400 })
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'Tidak ada baris data.' }, { status: 400 })
  }
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maksimal ${MAX_ROWS} baris per impor.` }, { status: 400 })
  }

  const res = await runImport({
    tenantId: ctx.tenant.id,
    userId:   ctx.session.user.id,
    entity:   body.entity,
    rows:     body.rows,
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 207 })
}
