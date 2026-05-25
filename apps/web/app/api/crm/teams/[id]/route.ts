import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getTeam, updateTeam, getTeamPerformance } from '../../../../../lib/crm-teams'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const [team, performance] = await Promise.all([
    getTeam(ctx.tenant.id, id),
    getTeamPerformance(ctx.tenant.id, id),
  ])

  if (!team) return NextResponse.json({ error: 'Tim tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ team, performance })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })

  const res = await updateTeam(ctx.tenant.id, id, body)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ team: res.team })
}
