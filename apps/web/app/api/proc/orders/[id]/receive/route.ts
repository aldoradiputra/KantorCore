import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { receivePO } from '../../../../../../lib/procurement'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const res = await receivePO(ctx.tenant.id, id, ctx.session.user.id)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json({ po: res.po, movesCreated: res.movesCreated })
}
