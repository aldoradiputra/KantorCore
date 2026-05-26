import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listStatements, STATEMENT_STATUS_LABEL, STATEMENT_STATUS_COLOR } from '../../../lib/finance-recon'
import { listJournals } from '../../../lib/finance-journals'
import { FinShell } from '../FinShell'
import { ReconWorkspace } from './ReconWorkspace'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ReconciliationPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const [statements, journals] = await Promise.all([
    listStatements(ctx.tenant.id),
    listJournals(ctx.tenant.id),
  ])
  return (
    <FinShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="reconciliation">
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Rekonsiliasi Bank</h1>
        <ReconWorkspace
          statements={statements}
          journals={journals}
          statusLabel={STATEMENT_STATUS_LABEL}
          statusColor={STATEMENT_STATUS_COLOR}
        />
      </div>
    </FinShell>
  )
}
