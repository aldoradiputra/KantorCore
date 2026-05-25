import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../lib/requireSession'
import { listAssessments, createAssessment } from '../../../lib/assessment'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const list = await listAssessments(ctx.tenant.id)
  return NextResponse.json({ assessments: list })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body?.title) return NextResponse.json({ error: 'Judul wajib diisi.' }, { status: 400 })

  const res = await createAssessment({
    tenantId:          ctx.tenant.id,
    userId:            ctx.session.user.id,
    title:             body.title,
    description:       body.description ?? null,
    instructions:      body.instructions ?? null,
    timeLimitMinutes:  body.timeLimitMinutes ?? null,
    passingScore:      body.passingScore ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ id: res.id }, { status: 201 })
}
