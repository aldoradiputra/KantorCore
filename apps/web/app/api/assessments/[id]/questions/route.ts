import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { addQuestion } from '../../../../../lib/assessment'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id: assessmentId } = await params
  const body = await req.json().catch(() => null)
  if (!body?.content) return NextResponse.json({ error: 'Konten wajib diisi.' }, { status: 400 })

  const res = await addQuestion({
    tenantId:     result.ctx.tenant.id,
    assessmentId,
    type:         body.type ?? 'multiple_choice',
    content:      body.content,
    points:       body.points,
    sectionId:    body.sectionId ?? null,
    explanation:  body.explanation ?? null,
    ratingMax:    body.ratingMax ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ questionId: res.questionId }, { status: 201 })
}
