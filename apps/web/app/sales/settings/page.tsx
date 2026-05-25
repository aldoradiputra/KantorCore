import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getSalesSettings } from '../../../lib/sales-settings'
import { SalesShell } from '../SalesShell'
import SettingsForm from './SettingsForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function SalesSettingsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const settings = await getSalesSettings(ctx.tenant.id)

  return (
    <SalesShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="settings"
    >
      <SettingsForm initial={settings} />
    </SalesShell>
  )
}
