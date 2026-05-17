import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { listIssues, createIssue } from '../../../../../../lib/proj'
import type { IssuePriority } from '@kantr/db'

const PRIORITIES: ReadonlyArray<IssuePriority> = ['none', 'low', 'medium', 'high', 'urgent']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id } = await params
  const issues = await listIssues({ tenantId: result.ctx.tenant.id, projectId: id })
  return NextResponse.json({ issues })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { title, body: issueBody, priority, assigneeId } = body as Record<string, unknown>
  if (typeof title !== 'string') {
    return NextResponse.json({ error: 'Missing title.' }, { status: 400 })
  }

  const { id } = await params
  const created = await createIssue({
    tenantId: result.ctx.tenant.id,
    projectId: id,
    userId: result.ctx.session.user.id,
    title,
    body: typeof issueBody === 'string' ? issueBody : undefined,
    priority:
      typeof priority === 'string' && PRIORITIES.includes(priority as IssuePriority)
        ? (priority as IssuePriority)
        : undefined,
    assigneeId: typeof assigneeId === 'string' ? assigneeId : null,
  })
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 })
  return NextResponse.json({ issue: created.issue })
}
