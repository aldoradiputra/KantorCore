import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listJournalEntries } from '../../../lib/finance'
import { FinShell } from '../FinShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const STATUS_LABEL: Record<string, string> = { draft: 'Draf', posted: 'Diposting', reversed: 'Dibalik' }
const STATUS_COLOR: Record<string, string> = { draft: 'var(--fg-3)', posted: 'var(--teal)', reversed: 'var(--amber)' }

export default async function JournalPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const entries = await listJournalEntries(ctx.tenant.id)

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="journal"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Jurnal Akuntansi</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
            Setiap entri tercatat double-entry (debit = kredit). Entri dibuat otomatis oleh dokumen seperti faktur dan tagihan.
          </p>
        </header>

        {entries.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center', font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
            Belum ada entri jurnal.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <Th>Nomor</Th><Th>Tanggal</Th><Th>Deskripsi</Th><Th>Referensi</Th><Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const color = STATUS_COLOR[e.status] ?? 'var(--fg-3)'
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <Link href={`/fin/journal/${e.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)' }}>{e.entryNumber}</Link>
                      </Td>
                      <Td>{e.date}</Td>
                      <Td>{e.description}</Td>
                      <Td>{e.referenceType ?? '—'}</Td>
                      <Td>
                        <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
                          {STATUS_LABEL[e.status] ?? e.status}
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
    </FinShell>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--fg-1)' }}>{children}</td>
}
