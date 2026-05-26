import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listJournals, JOURNAL_TYPE_LABEL } from '../../../lib/finance-journals'
import { FinShell } from '../FinShell'
import { JournalsClient } from './JournalsClient'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function JournalsSetupPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const journals = await listJournals(ctx.tenant.id)
  return (
    <FinShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="journals-setup">
      <div style={{ padding: 'var(--s-6)', maxWidth: 860 }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-5)' }}>Setup Jurnal</h1>
        <JournalsClient journals={journals} typeLabels={JOURNAL_TYPE_LABEL} />
      </div>
    </FinShell>
  )
}
