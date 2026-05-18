import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listMembers, createInvite, type InviteRole } from '../../../../lib/settings'
import { recordAudit, auditMetaFromRequest } from '../../../../lib/audit'

const VALID_ROLES: InviteRole[] = ['admin', 'member']

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  if (result.ctx.membership.role === 'member') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }
  const members = await listMembers(result.ctx.tenant.id)
  return NextResponse.json({ members })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  if (result.ctx.membership.role === 'member') {
    return NextResponse.json({ error: 'Hanya admin dan owner yang bisa mengundang anggota.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Missing email.' }, { status: 400 })
  }
  const role: InviteRole = VALID_ROLES.includes(body.role) ? body.role : 'member'
  const created = await createInvite({
    tenantId: result.ctx.tenant.id,
    invitedBy: result.ctx.session.user.id,
    email: body.email,
    role,
  })
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 })

  await recordAudit({
    tenantId: result.ctx.tenant.id,
    actorUserId: result.ctx.session.user.id,
    action: 'member.invite_create',
    resourceType: 'invite',
    resourceId: created.invite.id,
    payload: { email: created.invite.email, role: created.invite.role },
    ...auditMetaFromRequest(req),
  })

  return NextResponse.json({ invite: created.invite }, { status: 201 })
}
