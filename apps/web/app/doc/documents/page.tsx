import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import {
  listDocuments, getExpiringDocuments,
  DOC_TYPE_LABEL, DOC_STATUS_LABEL, DOC_STATUS_COLOR,
} from '../../../lib/documents'
import { DocShell } from '../DocShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatIDR(v: number) {
  return v === 0 ? '—' : 'Rp ' + v.toLocaleString('id-ID')
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null
  if (days < 0) return <span style={{ font: '600 10px/1 var(--font-sans)', padding: '2px 6px', borderRadius: 999, background: '#fee', color: 'var(--danger, #c33)' }}>Kadaluarsa</span>
  if (days <= 7) return <span style={{ font: '600 10px/1 var(--font-sans)', padding: '2px 6px', borderRadius: 999, background: '#fee', color: 'var(--danger, #c33)' }}>{days}h lagi</span>
  if (days <= 30) return <span style={{ font: '600 10px/1 var(--font-sans)', padding: '2px 6px', borderRadius: 999, background: '#fef3cd', color: '#B35A00' }}>{days}h lagi</span>
  return null
}

export default async function DocumentsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [list, expiring] = await Promise.all([
    listDocuments(ctx.tenant.id),
    getExpiringDocuments(ctx.tenant.id, 30),
  ])

  return (
    <DocShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="documents"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Dokumen & Kontrak</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Kelola kontrak, NDA, MoU, dan dokumen legal lainnya. Pantau tanggal kadaluarsa.
            </p>
          </div>
          <Link
            href="/doc/documents/new"
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none', flexShrink: 0 }}
          >
            + Dokumen Baru
          </Link>
        </header>

        {expiring.length > 0 && (
          <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: '#fef3cd', border: '1px solid #f0c040', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ font: '600 12px/1 var(--font-sans)', color: '#92400e' }}>⚠ {expiring.length} dokumen akan kadaluarsa dalam 30 hari:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {expiring.map((r) => (
                <Link key={r.doc.id} href={`/doc/documents/${r.doc.id}`} style={{ font: '12px/1 var(--font-sans)', color: '#92400e', textDecoration: 'underline' }}>
                  {r.doc.title} ({r.daysUntilExpiry}h)
                </Link>
              ))}
            </div>
          </div>
        )}

        {list.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada dokumen.</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <Th>Nomor</Th>
                  <Th>Judul</Th>
                  <Th>Tipe</Th>
                  <Th>Pihak</Th>
                  <Th>Berlaku S.d.</Th>
                  <Th align="right">Nilai</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const color = DOC_STATUS_COLOR[r.doc.status] ?? 'var(--fg-3)'
                  return (
                    <tr key={r.doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <Link href={`/doc/documents/${r.doc.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                          {r.doc.docNumber}
                        </Link>
                      </Td>
                      <Td>{r.doc.title}</Td>
                      <Td>{DOC_TYPE_LABEL[r.doc.type]}</Td>
                      <Td>{r.contactName ?? r.doc.partyName ?? '—'}</Td>
                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {r.doc.expiryDate ?? '—'}
                          <ExpiryBadge days={r.doc.status === 'active' ? r.daysUntilExpiry : null} />
                        </div>
                      </Td>
                      <Td align="right" mono>{formatIDR(r.doc.value)}</Td>
                      <Td>
                        <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
                          {DOC_STATUS_LABEL[r.doc.status]}
                        </span>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DocShell>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}>{children}</td>
}
