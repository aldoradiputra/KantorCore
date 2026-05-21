import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getOrCreateLayout, listBlocks } from '../../../../../lib/blocks'

export async function GET(req: Request, { params }: { params: Promise<{ scope: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { scope } = await params

  const layout = await getOrCreateLayout(ctx.tenant.id, scope, scope)
  const blocks = await listBlocks(ctx.tenant.id, layout.id)
  return NextResponse.json({ layout, blocks })
}
