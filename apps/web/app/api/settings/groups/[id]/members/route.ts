import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { setGroupMembers } from '../../../../../../lib/admin'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.userIds)) {
    return NextResponse.json({ error: 'Missing userIds array.' }, { status: 400 })
  }

  await setGroupMembers(ctx.tenant.id, id, body.userIds as string[])
  return NextResponse.json({ ok: true })
}
