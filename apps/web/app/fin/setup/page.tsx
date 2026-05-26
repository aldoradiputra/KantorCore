import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { FinShell } from '../FinShell'
import { SetupWizard } from './SetupWizard'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function SetupPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  return (
    <FinShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="setup">
      <div style={{ padding: 'var(--s-6)', maxWidth: 640 }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>Setup Akuntansi</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '0 0 var(--s-5)' }}>
          Konfigurasi awal modul keuangan. Selesaikan semua langkah sebelum mulai mencatat transaksi.
        </p>
        <SetupWizard />
      </div>
    </FinShell>
  )
}
