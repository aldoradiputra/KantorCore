import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getAgent, updateAgent, listMandates, listRuns } from '../../../../../lib/agent'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id } = await params
  const a = await getAgent(result.ctx.tenant.id, id)
  if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const [agentMandates, runs] = await Promise.all([
    listMandates(result.ctx.tenant.id, id),
    listRuns(result.ctx.tenant.id, id, 20),
  ])
  return NextResponse.json({ agent: a, mandates: agentMandates, runs })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { name, description, model, systemPrompt, enabled } = body as Record<string, unknown>
  const updated = await updateAgent(result.ctx.tenant.id, id, {
    ...(typeof name === 'string' ? { name } : {}),
    ...(typeof description === 'string' ? { description } : {}),
    ...(typeof model === 'string' ? { model } : {}),
    ...(typeof systemPrompt === 'string' ? { systemPrompt } : {}),
    ...(typeof enabled === 'boolean' ? { enabled } : {}),
  })
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 })
  return NextResponse.json({ agent: updated.agent })
}
