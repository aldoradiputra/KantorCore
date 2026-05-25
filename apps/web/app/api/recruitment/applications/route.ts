import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listApplications, createApplication } from '../../../../lib/recruitment'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const apps = await listApplications(ctx.tenant.id, {
    status:        searchParams.get('status') as any ?? undefined,
    jobPositionId: searchParams.get('jobId') ?? undefined,
    search:        searchParams.get('q') ?? undefined,
  })
  return NextResponse.json({ applications: apps })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body?.jobPositionId || !body?.candidateName || !body?.candidateEmail) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
  }
  const res = await createApplication({
    tenantId:       ctx.tenant.id,
    jobPositionId:  body.jobPositionId,
    candidateName:  body.candidateName,
    candidateEmail: body.candidateEmail,
    candidatePhone: body.candidatePhone ?? null,
    coverLetter:    body.coverLetter ?? null,
    source:         body.source ?? 'manual',
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ id: res.id, appNumber: res.appNumber }, { status: 201 })
}
