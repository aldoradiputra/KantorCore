import { NextResponse } from 'next/server'
import { getCurrentPortalSession } from '../../../../lib/portal-auth'
import { createTicket, listTickets, addMessage } from '../../../../lib/helpdesk'

export async function GET() {
  const session = await getCurrentPortalSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tickets = await listTickets(session.tenant.id, {})
  // Portal contacts only see their own tickets
  const mine = tickets.filter((t) => t.contactId === session.contact.id)
  return NextResponse.json(mine)
}

export async function POST(req: Request) {
  const session = await getCurrentPortalSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, body } = await req.json()
  if (!subject?.trim()) return NextResponse.json({ error: 'Subjek diperlukan.' }, { status: 400 })

  const ticket = await createTicket(session.tenant.id, {
    subject: subject.trim(),
    priority: 'medium',
    source: 'portal',
    contactId: session.contact.id,
    reporterName: session.contact.name,
    reporterEmail: session.contact.email ?? null,
  })

  if (body?.trim()) {
    await addMessage(session.tenant.id, {
      ticketId: ticket.id,
      body: body.trim(),
      authorUserId: null,
      authorContactId: session.contact.id,
      authorName: session.contact.name,
      isInternal: false,
    })
  }

  return NextResponse.json(ticket, { status: 201 })
}
