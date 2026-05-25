import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { advanceApplication } from '../../../../../../lib/recruitment'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body?.status) return NextResponse.json({ error: 'Status wajib diisi.' }, { status: 400 })

  const res = await advanceApplication({
    tenantId:  ctx.tenant.id,
    id,
    toStatus:  body.status,
    changedBy: ctx.session.user.id,
    notes:     body.notes ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
