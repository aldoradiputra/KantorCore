import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SettingsShell } from '../SettingsShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: 'var(--s-4)',
        padding: 'var(--s-3) 0',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
      }}
    >
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</span>
      <code style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--fg-1)', wordBreak: 'break-all' }}>
        {value}
      </code>
    </div>
  )
}

export default async function TechnicalPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const { tenant, membership } = ctx
  const user = session.user

  return (
    <SettingsShell
      activeSection="technical"
      isAdmin={isAdmin}
      tenantName={tenant.name}
      userInitials={initials(user.name)}
      userEmail={user.email}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          <h2 style={{ marginBottom: 'var(--s-2)' }}>Informasi Teknis</h2>
          <p style={{ color: 'var(--fg-3)', font: '400 13px/1.5 var(--font-sans)', marginBottom: 'var(--s-6)' }}>
            Informasi ini berguna untuk debugging, integrasi API, dan dukungan teknis.
            Jangan bagikan Tenant ID ke pihak yang tidak berwenang.
          </p>

          <Section title="Identitas">
            <Row label="Tenant ID" value={tenant.id} />
            <Row label="Tenant Slug" value={tenant.slug} />
            <Row label="User ID" value={user.id} />
            <Row label="Role" value={membership.role} />
          </Section>

          <Section title="Skema Database">
            <Row label="Platform schema" value="platform.*" />
            <Row label="Chat schema" value="chat.*" />
            <Row label="Proyek schema" value="proj.*" />
            <Row label="Agent schema" value="agent.*" />
          </Section>

          <Section title="Runtime">
            <Row label="Next.js" value="15 (App Router)" />
            <Row label="ORM" value="Drizzle ORM + postgres.js" />
            <Row label="AI Runtime" value="Anthropic Claude (IS-AGENT Phase 1)" />
          </Section>

          <div
            style={{
              marginTop: 'var(--s-5)',
              padding: 'var(--s-4)',
              background: 'var(--amber-light)',
              border: '1px solid rgba(179, 90, 0, 0.2)',
              borderRadius: 'var(--r-md)',
              font: '400 12px/1.5 var(--font-sans)',
              color: 'var(--amber)',
            }}
          >
            Fitur teknis lanjutan (API keys, webhook registry, audit log viewer, migration history)
            akan tersedia di Phase 2 bersama IS-PLAT-CTX dan IS-TRIG.
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s-6)' }}>
      <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>{title}</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0 var(--s-3)' }}>
        {children}
      </div>
    </div>
  )
}
