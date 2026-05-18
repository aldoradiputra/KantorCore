import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getInviteByToken, acceptInvite } from '../../../../lib/settings'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getInviteByToken(token)
  if (!invite) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    expired: invite.expiresAt < new Date(),
    used: !!invite.acceptedAt,
  })
}

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { token } = await params
  const result = await acceptInvite(token, session.user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
