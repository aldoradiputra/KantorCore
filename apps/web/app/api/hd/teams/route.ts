import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listTeams, createTeam } from '../../../../lib/helpdesk'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const teams = await listTeams(ctx.tenant.id)
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nama diperlukan.' }, { status: 400 })

  const team = await createTeam(ctx.tenant.id, name.trim(), description?.trim())
  return NextResponse.json(team, { status: 201 })
}
