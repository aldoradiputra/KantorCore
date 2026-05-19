import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { createRun } from '../../../../lib/agent'
import { executeRun } from '../../../../lib/agent-runner'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body.agentId !== 'string' || typeof body.prompt !== 'string') {
    return NextResponse.json({ error: 'agentId dan prompt wajib diisi.' }, { status: 400 })
  }

  const created = await createRun({
    tenantId: result.ctx.tenant.id,
    agentId: body.agentId,
    userId: result.ctx.session.user.id,
    prompt: body.prompt,
  })
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 })

  // Execute synchronously — Vercel hobby/pro: 60s/300s timeout.
  // Long-running agents need IS-FLOW queue (Phase 21).
  try {
    await executeRun(created.runId)
  } catch (err) {
    // Execution errors are stored on the run row; don't surface as 500.
    console.error('[agent-runner] uncaught error for run', created.runId, err)
  }

  return NextResponse.json({ runId: created.runId }, { status: 201 })
}
