import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listSlaPolicies, createSlaPolicy } from '../../../../lib/helpdesk'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const policies = await listSlaPolicies(ctx.tenant.id)
  return NextResponse.json(policies)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, conditions, responseTargetMinutes, resolutionTargetMinutes, priorityOrder } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Nama diperlukan.' }, { status: 400 })

  const policy = await createSlaPolicy(ctx.tenant.id, {
    name: name.trim(),
    description: description || null,
    conditions: conditions ?? {},
    responseTargetMinutes: responseTargetMinutes ?? 480,
    resolutionTargetMinutes: resolutionTargetMinutes ?? 2880,
    priorityOrder: priorityOrder ?? 0,
    active: true,
  })
  return NextResponse.json(policy, { status: 201 })
}
