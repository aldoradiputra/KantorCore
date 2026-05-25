import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { getThreeWayMatch } from '../../../../../../lib/sales-advanced'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id: soId } = await params

  const rows = await getThreeWayMatch(ctx.tenant.id, soId)
  return NextResponse.json({ rows })
}
