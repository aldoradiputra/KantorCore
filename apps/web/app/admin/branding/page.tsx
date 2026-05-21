import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getTenantBranding } from '../../../lib/branding'
import { AppShell } from '../../../components/AppShell'
import BrandingForm from './BrandingForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function AdminBrandingPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/')

  const branding = await getTenantBranding(ctx.tenant.id)

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeModule={null}
      tenantLogoUrl={branding.logoUrl}
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 720, overflowY: 'auto' }}>
        <header>
          <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Admin · Workspace</span>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
            Branding Workspace
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
            Sesuaikan logo, warna brand, dan latar layar masuk. Perubahan berlaku untuk semua anggota workspace.
          </p>
        </header>

        <BrandingForm initial={branding} tenantName={ctx.tenant.name} />
      </div>
    </AppShell>
  )
}
