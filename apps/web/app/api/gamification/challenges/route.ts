import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listChallenges, createChallenge } from '../../../../lib/gamification'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const challenges = await listChallenges(ctx.tenant.id)
  return NextResponse.json({ challenges })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.targetValue) {
    return NextResponse.json({ error: 'Judul dan target value wajib diisi.' }, { status: 400 })
  }
  const res = await createChallenge({
    tenantId:     ctx.tenant.id,
    userId:       ctx.session.user.id,
    title:        body.title,
    description:  body.description ?? null,
    metricType:   body.metricType ?? 'custom',
    targetValue:  Number(body.targetValue),
    targetDate:   body.targetDate ?? null,
    badgeId:      body.badgeId ?? null,
    isRepeatable: body.isRepeatable ?? false,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ challenge: res.challenge }, { status: 201 })
}
