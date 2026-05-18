import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { countActiveRuns } from '../../../../../lib/agent'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const count = await countActiveRuns(result.ctx.tenant.id)
  return NextResponse.json({ count })
}
