import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listTriggerRules, createTriggerRule } from '../../../../lib/triggers'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const rules = await listTriggerRules(ctx.tenant.id)
  return NextResponse.json(rules)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json()
  const { name, description, event, action, config } = body

  if (!name || !event || !action || !config) {
    return NextResponse.json({ error: 'name, event, action, config wajib diisi.' }, { status: 400 })
  }

  const res = await createTriggerRule({
    tenantId:    ctx.tenant.id,
    userId:      ctx.session.user.id,
    name,
    description: description ?? null,
    event,
    action,
    config,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.rule, { status: 201 })
}
