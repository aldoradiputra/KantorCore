import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { getTenantBranding } from '../../lib/branding'
import { AppShell } from '../../components/AppShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function KmsLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const branding = await getTenantBranding(ctx.tenant.id)

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeModule="kms"
      tenantLogoUrl={branding.logoUrl}
    >
      {children}
    </AppShell>
  )
}
