import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import {
  getDocument,
  DOC_TYPE_LABEL, DOC_STATUS_LABEL, DOC_STATUS_COLOR,
  daysUntilExpiry,
} from '../../../../lib/documents'
import { DocShell } from '../../DocShell'
import { DocStatusActions } from './DocStatusActions'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatIDR(v: number) {
  return v === 0 ? '—' : 'Rp ' + v.toLocaleString('id-ID')
}

export default async function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getDocument(ctx.tenant.id, id)
  if (!data) notFound()

  const { doc, contactName } = data
  const statusColor = DOC_STATUS_COLOR[doc.status] ?? 'var(--fg-3)'
  const days = doc.status === 'active' ? daysUntilExpiry(doc.expiryDate) : null

  return (
    <DocShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="documents"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 800 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Link href="/doc/documents" style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>← Dokumen</Link>
            </div>
            <div style={{ font: '12px/1 var(--font-mono, monospace)', color: 'var(--fg-3)', marginBottom: 4 }}>{doc.docNumber}</div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{doc.title}</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 999, color: statusColor, border: `1px solid ${statusColor}`, flexShrink: 0 }}>
              {DOC_STATUS_LABEL[doc.status]}
            </span>
            <span style={{ font: '600 11px/1 var(--font-sans)', padding: '3px 8px', borderRadius: 999, background: 'var(--bg)', color: 'var(--fg-3)', border: '1px solid var(--border)' }}>
              {DOC_TYPE_LABEL[doc.type]}
            </span>
          </div>
        </div>

        {/* Expiry warning */}
        {days !== null && days <= 30 && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: days <= 0 ? '#fee' : '#fef3cd', border: `1px solid ${days <= 0 ? '#fca5a5' : '#f0c040'}` }}>
            <span style={{ font: '600 13px/1 var(--font-sans)', color: days <= 0 ? 'var(--danger, #c33)' : '#92400e' }}>
              {days <= 0 ? 'Dokumen ini sudah kadaluarsa.' : `Dokumen ini akan kadaluarsa dalam ${days} hari (${doc.expiryDate}).`}
            </span>
          </div>
        )}

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
          {(contactName || doc.partyName) && (
            <InfoRow label="Pihak" value={contactName ?? doc.partyName ?? ''} />
          )}
          <InfoRow label="Nilai Kontrak" value={formatIDR(doc.value)} />
          {doc.startDate && <InfoRow label="Tanggal Mulai" value={doc.startDate} />}
          {doc.expiryDate && <InfoRow label="Tanggal Berakhir" value={doc.expiryDate} />}
          {doc.fileUrl && (
            <InfoRow label="File / Link" value={
              <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--indigo)', textDecoration: 'none' }}>Buka Dokumen →</a>
            } />
          )}
          {doc.notes && <InfoRow label="Catatan" value={doc.notes} />}
        </div>

        {/* Actions */}
        <DocStatusActions id={doc.id} status={doc.status} />
      </div>
    </DocShell>
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
