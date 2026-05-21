import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTeams } from '../../../lib/helpdesk'
import TeamsClient from './TeamsClient'

export default async function TeamsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  const teams = await listTeams(ctx.tenant.id)

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s-5)' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Tim Support</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Kelompok agen yang menangani tiket.
          </p>
        </div>
      </div>
      <TeamsClient teams={teams} isAdmin={isAdmin} />
    </div>
  )
}
