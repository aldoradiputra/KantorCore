import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { createTenantModel } from '../../../../lib/platform/tenant-models'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const r = await createTenantModel({
    tenantId: ctx.tenant.id,
    key: String(body.key ?? ''),
    label: String(body.label ?? ''),
    labelPlural: body.labelPlural ? String(body.labelPlural) : undefined,
    numberingPrefix: body.numberingPrefix,
    numberingFormat: body.numberingFormat,
  })

  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json({ model: r.model }, { status: 201 })
}
