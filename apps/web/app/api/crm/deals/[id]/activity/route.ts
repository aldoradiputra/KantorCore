import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { addActivity, type ActivityType } from '../../../../../../lib/crm'

const VALID_TYPES: ActivityType[] = ['note','call','email','meeting']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const body = await req.json()
  const res = await addActivity({
    tenantId: ctx.tenant.id,
    dealId:   id,
    userId:   ctx.session.user.id,
    type:     VALID_TYPES.includes(body.type) ? body.type : 'note',
    title:    body.title,
    notes:    body.notes ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.activity, { status: 201 })
}
