import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listGroups, createGroup } from '../../../../lib/admin'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const groups = await listGroups(ctx.tenant.id)
  return NextResponse.json({ groups })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Missing name.' }, { status: 400 })
  }

  const res = await createGroup({
    tenantId: ctx.tenant.id,
    userId: ctx.session.user.id,
    name: body.name,
    description: typeof body.description === 'string' ? body.description : undefined,
    emailAlias: typeof body.emailAlias === 'string' ? body.emailAlias : undefined,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ group: res.group }, { status: 201 })
}
