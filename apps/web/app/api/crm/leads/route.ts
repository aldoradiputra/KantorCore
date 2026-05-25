import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listLeads, createLead } from '../../../../lib/crm-teams'
import type { LeadStatus } from '../../../../lib/crm-teams'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const teamId    = searchParams.get('teamId') ?? undefined
  const assignedTo = searchParams.get('assignedTo') ?? undefined
  const status    = searchParams.get('status') as LeadStatus | undefined
  const limit     = Number(searchParams.get('limit') ?? 50)
  const offset    = Number(searchParams.get('offset') ?? 0)

  const { leads, total } = await listLeads(ctx.tenant.id, { teamId, assignedTo, status, limit, offset })
  return NextResponse.json({ leads, total })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body?.firstName) return NextResponse.json({ error: 'Nama depan wajib diisi.' }, { status: 400 })

  const res = await createLead({
    tenantId:      ctx.tenant.id,
    userId:        ctx.session.user.id,
    firstName:     body.firstName,
    lastName:      body.lastName ?? null,
    email:         body.email ?? null,
    phone:         body.phone ?? null,
    companyName:   body.companyName ?? null,
    jobTitle:      body.jobTitle ?? null,
    industry:      body.industry ?? null,
    employeeCount: body.employeeCount ?? null,
    location:      body.location ?? null,
    utmSource:     body.utmSource ?? null,
    utmMedium:     body.utmMedium ?? null,
    utmCampaign:   body.utmCampaign ?? null,
    tags:          body.tags ?? [],
    assignedTeamId: body.assignedTeamId ?? null,
    notes:         body.notes ?? null,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ lead: res.lead }, { status: 201 })
}
