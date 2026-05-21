import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getDeal, STAGE_LABEL } from '../../../../lib/crm'
import { CrmShell } from '../../CrmShell'
import { DealActions } from './DealActions'
import { ActivityLog } from './ActivityLog'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatIDR(v: number) {
  return v === 0 ? '—' : 'Rp ' + v.toLocaleString('id-ID')
}

const STAGE_COLOR: Record<string, string> = {
  lead:        '#6B7280',
  qualified:   '#3B4FC4',
  proposal:    '#7C3AED',
  negotiation: '#B35A00',
  won:         '#0F7B6C',
  lost:        '#DC2626',
}

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getDeal(ctx.tenant.id, id)
  if (!data) notFound()

  const { deal, activities, contact } = data
  const stageColor = STAGE_COLOR[deal.stage] ?? 'var(--fg-3)'

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="deals"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Link href="/crm/deals" style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>← Pipeline</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
              <span style={{ font: '12px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>{deal.dealNumber}</span>
            </div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{deal.title}</h1>
          </div>
          <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 999, color: stageColor, border: `1px solid ${stageColor}`, flexShrink: 0 }}>
            {STAGE_LABEL[deal.stage]}
          </span>
        </div>

        {/* Info card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
          {(deal.contactName || contact) && (
            <InfoRow label="Kontak" value={contact ? `${contact.name}${contact.email ? ` · ${contact.email}` : ''}` : deal.contactName ?? ''} />
          )}
          <InfoRow label="Nilai Estimasi" value={formatIDR(deal.expectedValue)} />
          {deal.expectedClose && <InfoRow label="Target Tutup" value={deal.expectedClose} />}
          {deal.notes && <InfoRow label="Catatan" value={deal.notes} />}
          {deal.soId && (
            <InfoRow label="Sales Order" value={
              <Link href={`/sales/orders/${deal.soId}`} style={{ color: 'var(--indigo)', textDecoration: 'none' }}>Lihat SO →</Link>
            } />
          )}
        </div>

        {/* Stage actions */}
        {deal.stage !== 'won' && deal.stage !== 'lost' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pindah Stage</span>
            <DealActions id={deal.id} currentStage={deal.stage} />
          </div>
        )}

        {/* Activity log */}
        <ActivityLog dealId={deal.id} activities={activities} />
      </div>
    </CrmShell>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</div>
    </div>
  )
}
