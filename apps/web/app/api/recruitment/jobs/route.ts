import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listJobPositions, createJobPosition } from '../../../../lib/recruitment'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const jobs = await listJobPositions(ctx.tenant.id, {
    status: searchParams.get('status') as any ?? undefined,
    search: searchParams.get('q') ?? undefined,
  })
  return NextResponse.json({ jobs })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body?.title) return NextResponse.json({ error: 'Judul posisi wajib diisi.' }, { status: 400 })

  const res = await createJobPosition({
    tenantId:     ctx.tenant.id,
    userId:       ctx.session.user.id,
    title:        body.title,
    departmentId: body.departmentId ?? null,
    headcount:    body.headcount ?? 1,
    description:  body.description ?? null,
    requirements: body.requirements ?? null,
    salaryMin:    body.salaryMin ?? null,
    salaryMax:    body.salaryMax ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ id: res.id }, { status: 201 })
}
