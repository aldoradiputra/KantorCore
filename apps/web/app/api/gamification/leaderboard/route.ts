import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getLeaderboard } from '../../../../lib/gamification'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '10', 10)
  const rows = await getLeaderboard(ctx.tenant.id, limit)
  return NextResponse.json({ leaderboard: rows })
}
