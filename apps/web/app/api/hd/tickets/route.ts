import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listTickets, createTicket } from '../../../../lib/helpdesk'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as import('@kantorcore/db').TicketStatus | null
  const assigneeId = searchParams.get('assigneeId') ?? undefined
  const search = searchParams.get('search') ?? undefined

  const tickets = await listTickets(ctx.tenant.id, { status: status ?? undefined, assigneeId, search })
  return NextResponse.json(tickets)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json()
  const { subject, priority, source, contactId, reporterName, reporterEmail, teamId, assigneeId } = body

  if (!subject?.trim()) return NextResponse.json({ error: 'Subjek diperlukan.' }, { status: 400 })

  const ticket = await createTicket(ctx.tenant.id, {
    subject: subject.trim(),
    priority: priority ?? 'medium',
    source: source ?? 'manual',
    contactId: contactId || null,
    reporterName: reporterName?.trim() || null,
    reporterEmail: reporterEmail?.trim() || null,
    teamId: teamId || null,
    assigneeId: assigneeId || null,
    createdBy: ctx.session.user.id,
  })

  return NextResponse.json(ticket, { status: 201 })
}
