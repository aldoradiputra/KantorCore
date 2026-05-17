import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { updateIssue } from '../../../../../lib/proj'
import type { IssueStatus, IssuePriority } from '@kantr/db'

const STATUSES: ReadonlyArray<IssueStatus> = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
]
const PRIORITIES: ReadonlyArray<IssuePriority> = ['none', 'low', 'medium', 'high', 'urgent']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { title, body: issueBody, status, priority, assigneeId } = body as Record<string, unknown>

  const patch: Parameters<typeof updateIssue>[0]['patch'] = {}
  if (typeof title === 'string') patch.title = title
  if (issueBody === null || typeof issueBody === 'string') patch.body = issueBody
  if (typeof status === 'string' && STATUSES.includes(status as IssueStatus)) {
    patch.status = status as IssueStatus
  }
  if (typeof priority === 'string' && PRIORITIES.includes(priority as IssuePriority)) {
    patch.priority = priority as IssuePriority
  }
  if (assigneeId === null || typeof assigneeId === 'string') {
    patch.assigneeId = assigneeId
  }

  const { id } = await params
  const updated = await updateIssue({
    tenantId: result.ctx.tenant.id,
    issueId: id,
    patch,
  })
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 })
  return NextResponse.json({ issue: updated.issue })
}
