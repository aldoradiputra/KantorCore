import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { addTeamMember, removeTeamMember } from '../../../../../../lib/crm-teams'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id: teamId } = await params

  const body = await req.json().catch(() => null)
  if (!body?.userId) return NextResponse.json({ error: 'userId wajib diisi.' }, { status: 400 })

  const res = await addTeamMember({
    tenantId:             ctx.tenant.id,
    teamId,
    userId:               body.userId,
    role:                 body.role ?? 'member',
    personalTargetRevenue: body.personalTargetRevenue ?? null,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id: teamId } = await params

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId wajib diisi.' }, { status: 400 })

  const res = await removeTeamMember(ctx.tenant.id, teamId, userId)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
