import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { moveDealStage, type DealStage } from '../../../../../../lib/crm'

const VALID: DealStage[] = ['lead','qualified','proposal','negotiation','won','lost']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const body = await req.json()
  if (!VALID.includes(body.stage)) {
    return NextResponse.json({ error: 'Stage tidak valid.' }, { status: 400 })
  }
  const res = await moveDealStage(ctx.tenant.id, id, body.stage)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.deal)
}
