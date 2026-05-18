import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listAgents, createAgent } from '../../../../lib/agent'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const list = await listAgents(result.ctx.tenant.id)
  return NextResponse.json({ agents: list })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { name, description, model, systemPrompt } = body as Record<string, unknown>
  if (typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing name.' }, { status: 400 })
  }

  const created = await createAgent({
    tenantId: result.ctx.tenant.id,
    userId: result.ctx.session.user.id,
    name,
    description: typeof description === 'string' ? description : undefined,
    model: typeof model === 'string' ? model : undefined,
    systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : undefined,
  })
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 })
  return NextResponse.json({ agent: created.agent }, { status: 201 })
}
