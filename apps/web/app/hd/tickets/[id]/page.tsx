import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getTicket, listMessages, listTeams } from '../../../../lib/helpdesk'
import TicketDetail from './TicketDetail'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id } = await params
  const [ticket, messages, teams] = await Promise.all([
    getTicket(ctx.tenant.id, id),
    listMessages(ctx.tenant.id, id),
    listTeams(ctx.tenant.id),
  ])

  if (!ticket) redirect('/hd/tickets')

  return (
    <TicketDetail
      ticket={ticket}
      messages={messages}
      teams={teams}
      currentUserId={session.user.id}
      currentUserName={session.user.name}
    />
  )
}
