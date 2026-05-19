import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { rejectRun } from '../../../../../../lib/agent'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const { id } = await params
  const ok = await rejectRun(result.ctx.tenant.id, id)
  if (!ok.ok) return NextResponse.json({ error: ok.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
