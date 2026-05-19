import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import {
  getProcessBySlug,
  PROCESS_MODE_LABEL,
  PROCESS_MODE_COLOR,
  PROCESS_MODE_DESCRIPTION,
  MODULE_LABEL,
  STEP_KIND_LABEL,
} from '../../../lib/processes'
import { AppShell } from '../../../components/AppShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ProsesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getProcessBySlug(ctx.tenant.id, slug)
  if (!data) notFound()

  const { template, steps } = data

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeModule="proses"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        {/* Breadcrumb */}
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/proses" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
            Pustaka Proses
          </Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span>{MODULE_LABEL[template.module] ?? template.module}</span>
        </div>

        {/* Header */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ font: '600 22px/1.25 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
              {template.name}
            </h1>
            <span
              style={{
                font: '600 10px/1 var(--font-sans)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '4px 8px',
                borderRadius: 999,
                color: PROCESS_MODE_COLOR[template.mode],
                border: `1px solid ${PROCESS_MODE_COLOR[template.mode]}`,
                background: 'var(--surface)',
              }}
              title={PROCESS_MODE_DESCRIPTION[template.mode]}
            >
              {PROCESS_MODE_LABEL[template.mode]}
            </span>
          </div>
          <p style={{ font: '14px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0, maxWidth: 720 }}>
            {template.description}
          </p>
        </header>

        {/* Flowchart */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1
            const accent = PROCESS_MODE_COLOR[step.mode]
            return (
              <div key={step.id} style={{ display: 'flex', gap: 'var(--s-4)' }}>
                {/* Rail with circle + line */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 28,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      border: `2px solid ${accent}`,
                      color: accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      font: '600 12px/1 var(--font-sans)',
                      flexShrink: 0,
                    }}
                  >
                    {step.sequence}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        flex: 1,
                        width: 2,
                        background: 'var(--border)',
                        marginTop: 4,
                        marginBottom: 4,
                        minHeight: 24,
                      }}
                    />
                  )}
                </div>

                {/* Step card */}
                <div
                  style={{
                    flex: 1,
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${accent}`,
                    borderRadius: 'var(--r-md)',
                    background: 'var(--surface)',
                    padding: '14px 16px',
                    marginBottom: 'var(--s-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                      {step.name}
                    </span>
                    <span
                      style={{
                        font: '600 10px/1 var(--font-sans)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '3px 6px',
                        borderRadius: 4,
                        background: 'var(--bg)',
                        color: 'var(--fg-3)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {STEP_KIND_LABEL[step.kind] ?? step.kind}
                    </span>
                    <span
                      style={{
                        font: '600 10px/1 var(--font-sans)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '3px 6px',
                        borderRadius: 4,
                        color: accent,
                        border: `1px solid ${accent}`,
                      }}
                    >
                      {PROCESS_MODE_LABEL[step.mode]}
                    </span>
                  </div>

                  <p style={{ font: '13px/1.55 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
                    {step.description}
                  </p>

                  {/* Meta strip */}
                  {(step.trigger || step.producesRecordType || step.requiredRole || step.auditEvent || step.reversible) && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 'var(--s-3) var(--s-4)' }}>
                      {step.trigger && (
                        <MetaPair label="Pemicu" value={step.trigger} mono />
                      )}
                      {step.producesRecordType && (
                        <MetaPair label="Menghasilkan" value={step.producesRecordType} mono />
                      )}
                      {step.requiredRole && <MetaPair label="Peran" value={step.requiredRole} />}
                      {step.auditEvent && <MetaPair label="Event audit" value={step.auditEvent} mono />}
                      <MetaPair
                        label="Reversible"
                        value={step.reversible ? 'Ya' : 'Tidak'}
                        color={step.reversible ? 'var(--teal)' : 'var(--fg-3)'}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footnote */}
        <div
          style={{
            padding: '12px 14px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg)',
            font: '12px/1.55 var(--font-sans)',
            color: 'var(--fg-3)',
          }}
        >
          {template.isSystem ? (
            <>Proses sistem · versi manifest {template.manifestVersion}. Tidak dapat dihapus; akan diperbarui otomatis saat manifest naik versi.</>
          ) : (
            <>Proses kustom · dibuat oleh workspace.</>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function MetaPair({
  label,
  value,
  mono,
  color,
}: {
  label: string
  value: string
  mono?: boolean
  color?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span
        style={{
          font: '600 10px/1 var(--font-sans)',
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: mono ? '12px/1.3 var(--font-mono, monospace)' : '12px/1.3 var(--font-sans)',
          color: color ?? 'var(--fg-1)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
