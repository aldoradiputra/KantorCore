import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { createCustomField } from '../../../../lib/platform/custom-fields'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  try {
    const field = await createCustomField({
      tenantId: ctx.tenant.id,
      modelKey: String(body.modelKey),
      key: String(body.key),
      label: String(body.label),
      typeKey: String(body.typeKey),
      isRequired: !!body.isRequired,
      options: body.options && typeof body.options === 'object' ? body.options : undefined,
      helpText: body.helpText ? String(body.helpText) : undefined,
      displayOrder: typeof body.displayOrder === 'number' ? body.displayOrder : undefined,
    })
    return NextResponse.json({ field })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membuat field.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
