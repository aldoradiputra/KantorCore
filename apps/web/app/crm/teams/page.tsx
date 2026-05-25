import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTeams } from '../../../lib/crm-teams'
import { CrmShell } from '../CrmShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatIDR(v: number) {
  if (v === 0) return '—'
  return 'Rp ' + v.toLocaleString('id-ID')
}

export default async function CrmTeamsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const teams = await listTeams(ctx.tenant.id)

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="teams"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Tim Sales</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
              {teams.length} tim aktif
            </p>
          </div>
          <Link
            href="/crm/teams/new"
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none' }}
          >
            + Tim Baru
          </Link>
        </header>

        {teams.length === 0 ? (
          <div style={{ padding: 'var(--s-10)', textAlign: 'center', color: 'var(--fg-3)', font: '14px/1.5 var(--font-sans)' }}>
            Belum ada tim. Buat tim pertama untuk memulai manajemen pipeline.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {teams.map((team) => {
              const totalActiveDeals = team.members.reduce((s, m) => s + m.activeDeals, 0)
              const totalWonRevenue  = team.members.reduce((s, m) => s + m.wonRevenue, 0)
              const totalWonDeals    = team.members.reduce((s, m) => s + m.wonDeals, 0)
              const targetPct = team.targetRevenue > 0
                ? Math.min(100, Math.round(totalWonRevenue / team.targetRevenue * 100))
                : null

              return (
                <Link
                  key={team.id}
                  href={`/crm/teams/${team.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    padding: 'var(--s-5)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--s-4)',
                    transition: 'border-color var(--d-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--indigo)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
                      <div>
                        <div style={{ font: '600 16px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{team.name}</div>
                        {team.description && (
                          <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>{team.description}</div>
                        )}
                        {team.leaderName && (
                          <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 6 }}>
                            Pemimpin: <span style={{ color: 'var(--fg-2)' }}>{team.leaderName}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', flexShrink: 0 }}>
                        {team.members.length} anggota
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s-3)' }}>
                      {[
                        { label: 'Deal aktif', value: String(totalActiveDeals) },
                        { label: 'Deal menang', value: String(totalWonDeals) },
                        { label: 'Pendapatan', value: formatIDR(totalWonRevenue) },
                        { label: 'Target', value: formatIDR(team.targetRevenue) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
                          <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>{label}</div>
                          <div style={{ font: '600 14px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    {targetPct !== null && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                          <span>Pencapaian target</span>
                          <span>{targetPct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${targetPct}%`, background: targetPct >= 100 ? 'var(--teal)' : 'var(--indigo)', borderRadius: 2, transition: 'width .3s' }} />
                        </div>
                      </div>
                    )}

                    {/* Member avatars */}
                    {team.members.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {team.members.slice(0, 8).map((m) => (
                          <div key={m.userId} title={m.userName} style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: m.role === 'leader' ? 'var(--indigo)' : 'var(--bg)',
                            border: `2px solid ${m.role === 'leader' ? 'var(--indigo)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            font: '600 10px/1 var(--font-sans)',
                            color: m.role === 'leader' ? 'white' : 'var(--fg-2)',
                          }}>
                            {initials(m.userName)}
                          </div>
                        ))}
                        {team.members.length > 8 && (
                          <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginLeft: 4 }}>
                            +{team.members.length - 8}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </CrmShell>
  )
}
