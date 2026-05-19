import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listAccounts, ACCOUNT_TYPE_LABEL } from '../../../lib/finance'
import { FinShell } from '../FinShell'
import { SeedButton } from './SeedButton'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const

export default async function CoaPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const allAccounts = await listAccounts(ctx.tenant.id)
  const grouped = new Map<string, typeof allAccounts>()
  for (const a of allAccounts) {
    const list = grouped.get(a.type) ?? []
    list.push(a)
    grouped.set(a.type, list)
  }

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="coa"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 960 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Bagan Akun (Chart of Accounts)</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Daftar akun yang digunakan untuk pencatatan jurnal. Workspace baru otomatis di-seed dengan akun standar SAK sederhana.
            </p>
          </div>
          {allAccounts.length === 0 && <SeedButton />}
        </header>

        {allAccounts.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada akun.</div>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              Klik tombol di atas untuk memuat akun standar.
            </div>
          </div>
        ) : (
          TYPE_ORDER.map((type) => {
            const list = grouped.get(type) ?? []
            if (list.length === 0) return null
            return (
              <section key={type} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
                <h2 style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  {ACCOUNT_TYPE_LABEL[type]}
                </h2>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
                    <tbody>
                      {list.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 14px', width: 80, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-3)' }}>{a.code}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--fg-1)' }}>
                            <div style={{ font: '500 13px/1.3 var(--font-sans)' }}>{a.name}</div>
                            {a.description && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{a.description}</div>}
                          </td>
                          <td style={{ padding: '10px 14px', width: 120, textAlign: 'right' }}>
                            {a.isReconcilable && (
                              <span style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '3px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Rekonsiliasi
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })
        )}
      </div>
    </FinShell>
  )
}
