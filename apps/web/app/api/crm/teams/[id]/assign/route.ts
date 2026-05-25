import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { runAssignment } from '../../../../../../lib/crm-teams'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id: teamId } = await params

  const body = await req.json().catch(() => ({}))
  const ruleId: string | undefined = body?.ruleId

  const res = await runAssignment(ctx.tenant.id, teamId, ruleId)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ assigned: res.assigned })
}
