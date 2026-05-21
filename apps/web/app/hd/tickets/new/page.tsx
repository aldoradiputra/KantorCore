import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listTeams } from '../../../../lib/helpdesk'
import NewTicketForm from './NewTicketForm'

export default async function NewTicketPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const teams = await listTeams(ctx.tenant.id)

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 680 }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Help Desk · Tiket Baru</span>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          Buat Tiket
        </h1>
      </header>
      <NewTicketForm teams={teams} />
    </div>
  )
}
