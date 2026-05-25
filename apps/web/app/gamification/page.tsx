import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { getLeaderboard } from '../../lib/gamification'
import { GamificationShell } from './GamificationShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const MEDALS = ['🥇', '🥈', '🥉']

export default async function GamificationPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const leaderboard = await getLeaderboard(ctx.tenant.id, 20)

  return (
    <GamificationShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="overview">
      <div style={{ padding: 'var(--s-6)', maxWidth: 700 }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>Papan Skor</h1>
        <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '0 0 var(--s-5)' }}>
          Peringkat karyawan berdasarkan tantangan yang diselesaikan
        </p>

        {leaderboard.length === 0 ? (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', color: 'var(--fg-3)', font: '13px/1.6 var(--font-sans)' }}>
            Belum ada data. Buat tantangan dan mulai pantau performa tim.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {leaderboard.map((row, i) => (
              <div key={row.employeeId} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--s-4)',
                padding: 'var(--s-3) var(--s-4)',
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: i < 3 ? 'var(--surface)' : 'var(--bg)',
              }}>
                <div style={{ width: 28, textAlign: 'center', font: '700 18px/1 sans-serif' }}>
                  {MEDALS[i] ?? <span style={{ font: '600 14px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                    {row.employeeName ?? '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--s-4)', flexShrink: 0 }}>
                  <Stat label="Tantangan" value={Number(row.completed)} color="var(--teal)" />
                  <Stat label="Lencana" value={Number(row.badges)} color="var(--amber)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GamificationShell>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 48 }}>
      <div style={{ font: `600 20px/1 var(--font-mono, monospace)`, color }}>{value}</div>
      <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
