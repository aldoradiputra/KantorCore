import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listImportJobs, ENTITY_LABEL } from '../../../lib/migration'
import { MigShell } from '../MigShell'
import { ImportWizard } from './ImportWizard'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function MigImportPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const jobs = await listImportJobs(ctx.tenant.id)

  return (
    <MigShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="import"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 900 }}>
        <header>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Import Data</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
            Impor massal kontak, produk, atau akun keuangan dari CSV / Excel. Maksimal 500 baris per impor.
          </p>
        </header>

        <ImportWizard />

        {/* Import history */}
        {jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Riwayat Impor</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
                <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <Th>Entitas</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Berhasil</Th>
                    <Th align="right">Gagal</Th>
                    <Th>Status</Th>
                    <Th>Waktu</Th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>{ENTITY_LABEL[j.entity]}</Td>
                      <Td align="right" mono>{j.totalRows}</Td>
                      <Td align="right" mono style={{ color: 'var(--teal)' }}>{j.imported}</Td>
                      <Td align="right" mono style={{ color: j.failed > 0 ? 'var(--danger, #c33)' : undefined }}>{j.failed}</Td>
                      <Td>
                        <span style={{
                          font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '3px 7px', borderRadius: 999,
                          color: j.status === 'done' ? 'var(--teal)' : j.status === 'failed' ? 'var(--danger,#c33)' : 'var(--fg-3)',
                          border: `1px solid ${j.status === 'done' ? 'var(--teal)' : j.status === 'failed' ? 'var(--danger,#c33)' : 'var(--border)'}`,
                        }}>
                          {j.status === 'done' ? 'Selesai' : j.status === 'failed' ? 'Gagal' : 'Proses'}
                        </span>
                      </Td>
                      <Td>{new Date(j.createdAt).toLocaleString('id-ID')}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MigShell>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono, style }: { children: React.ReactNode; align?: 'right'; mono?: boolean; style?: React.CSSProperties }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined, ...style }}>{children}</td>
}
