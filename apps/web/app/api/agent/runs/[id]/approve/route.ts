import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { approveRun } from '../../../../../../lib/agent'
import { executeRun } from '../../../../../../lib/agent-runner'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const approvalOutput = (body as Record<string, unknown>).output

  const ok = await approveRun(result.ctx.tenant.id, id, approvalOutput)
  if (!ok.ok) return NextResponse.json({ error: ok.error }, { status: 400 })

  // Resume execution
  try {
    await executeRun(id)
  } catch (err) {
    console.error('[agent-runner] resume error for run', id, err)
  }

  return NextResponse.json({ ok: true })
}
