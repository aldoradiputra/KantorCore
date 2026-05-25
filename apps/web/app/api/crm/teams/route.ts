import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listTeams, createTeam } from '../../../../lib/crm-teams'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const teams = await listTeams(ctx.tenant.id)
  return NextResponse.json({ teams })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'Nama tim wajib diisi.' }, { status: 400 })

  const res = await createTeam({
    tenantId:            ctx.tenant.id,
    name:                body.name,
    description:         body.description ?? null,
    leaderId:            body.leaderId ?? null,
    targetRevenue:       body.targetRevenue ?? 0,
    targetDealCount:     body.targetDealCount ?? 0,
    assignmentFrequency: body.assignmentFrequency ?? 'weekly',
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ team: res.team }, { status: 201 })
}
