import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getPipelineSummary, STAGE_LABEL, type DealStage } from '../../../lib/crm'
import { getProbabilityDistribution } from '../../../lib/crm-forecast'
import { CrmShell } from '../CrmShell'
import PipelineCharts from './PipelineCharts'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatIDR(v: number) {
  if (v === 0) return '—'
  return 'Rp ' + v.toLocaleString('id-ID')
}

const STAGE_COLOR: Record<DealStage, string> = {
  lead:        '#6B7280',
  qualified:   '#3B4FC4',
  proposal:    '#7C3AED',
  negotiation: '#B35A00',
  won:         '#0F7B6C',
  lost:        '#DC2626',
}

export default async function CrmDealsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [pipeline, probabilityDeals] = await Promise.all([
    getPipelineSummary(ctx.tenant.id),
    getProbabilityDistribution(ctx.tenant.id),
  ])

  const total = pipeline.reduce((s, p) => s + p.count, 0)
  const totalValue = pipeline
    .filter((p) => p.stage !== 'lost')
    .reduce((s, p) => s + p.totalValue, 0)

  const funnelData = pipeline.map((p) => ({ stage: p.stage, count: p.count, totalValue: p.totalValue }))

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="pipeline"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 1200, height: '100%', overflowY: 'auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)', flexShrink: 0 }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Pipeline CRM</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
              {total} deal aktif · Nilai pipeline: {formatIDR(totalValue)}
            </p>
          </div>
          <Link
            href="/crm/deals/new"
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none', flexShrink: 0 }}
          >
            + Deal Baru
          </Link>
        </header>

        {/* Charts row */}
        <PipelineCharts funnelData={funnelData} probabilityDeals={probabilityDeals} />

        {/* Kanban columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(160px, 1fr))', gap: 'var(--s-3)', overflowX: 'auto', flexShrink: 0 }}>
          {pipeline.map((col) => (
            <div key={col.stage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLOR[col.stage], flexShrink: 0 }} />
                <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {col.label}
                </span>
                <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{col.count}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
                {col.deals.length === 0 ? (
                  <div style={{ padding: '20px 8px', textAlign: 'center', font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>—</div>
                ) : (
                  col.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/crm/deals/${deal.id}`}
                      style={{
                        display: 'block',
                        padding: '10px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--surface)',
                        textDecoration: 'none',
                        borderLeft: `3px solid ${STAGE_COLOR[col.stage]}`,
                      }}
                    >
                      <div style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 4 }}>{deal.title}</div>
                      {deal.contactName && (
                        <div style={{ font: '11px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>{deal.contactName}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        {deal.expectedValue > 0 && (
                          <div style={{ font: '600 11px/1 var(--font-mono, monospace)', color: 'var(--fg-2)' }}>{formatIDR(deal.expectedValue)}</div>
                        )}
                        {deal.probability !== undefined && deal.probability !== 20 && (
                          <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{deal.probability}%</div>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {col.totalValue > 0 && (
                <div style={{ font: '600 11px/1 var(--font-mono, monospace)', color: 'var(--fg-3)', padding: '4px 8px', textAlign: 'right' }}>
                  {formatIDR(col.totalValue)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </CrmShell>
  )
}
