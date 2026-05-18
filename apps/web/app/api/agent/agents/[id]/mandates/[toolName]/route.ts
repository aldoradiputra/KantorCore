import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../../lib/requireSession'
import { revokeMandate } from '../../../../../../../lib/agent'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; toolName: string }> },
) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id, toolName } = await params
  await revokeMandate(result.ctx.tenant.id, id, decodeURIComponent(toolName))
  return NextResponse.json({ ok: true })
}
