'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { SalespersonReport } from '../../../lib/crm-forecast'
import type { ForecastPeriod } from '../../../lib/crm-forecast'

const PRESETS = [
  { value: 'this_month',   label: 'Bulan Ini' },
  { value: 'next_month',   label: 'Bulan Depan' },
  { value: 'this_quarter', label: 'Kuartal Ini' },
  { value: 'this_year',    label: 'Tahun Ini' },
]

function formatIDR(v: number) {
  if (v === 0) return '—'
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`
  return 'Rp ' + v.toLocaleString('id-ID')
}

function WinRateBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? '#0F7B6C' : pct >= 40 ? '#3B4FC4' : '#B35A00'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ font: '600 12px/1 var(--font-mono, monospace)', color, width: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

interface Props {
  report: SalespersonReport[]
  teams: { id: string; name: string }[]
  period: ForecastPeriod
  selectedTeamId: string | null
  selectedPreset: string
}

export default function ReportsClient({ report, teams, period, selectedTeamId, selectedPreset }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigate = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const totalRevenue  = report.reduce((s, r) => s + r.totalRevenue, 0)
  const totalWon      = report.reduce((s, r) => s + r.wonDeals, 0)
  const totalActive   = report.reduce((s, r) => s + r.activeDeals, 0)
  const avgWinRate    = report.length > 0 ? Math.round(report.reduce((s, r) => s + r.winRate, 0) / report.length) : 0

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 1100, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)', flexWrap: 'wrap', flexShrink: 0 }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Laporan Kinerja</h1>
          <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>{period.label}</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          {teams.length > 0 && (
            <select
              value={selectedTeamId ?? ''}
              onChange={(e) => navigate({ teamId: e.target.value || null })}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', background: 'var(--surface)', cursor: 'pointer' }}
            >
              <option value="">Semua Tim</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => navigate({ preset: p.value })}
                style={{
                  padding: '7px 12px',
                  border: 'none',
                  borderRight: '1px solid var(--border)',
                  background: selectedPreset === p.value ? 'var(--indigo)' : 'var(--surface)',
                  color: selectedPreset === p.value ? 'white' : 'var(--fg-2)',
                  font: '12px/1 var(--font-sans)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s-3)', flexShrink: 0 }}>
        {[
          { label: 'Total Pendapatan', value: formatIDR(totalRevenue) },
          { label: 'Deal Menang', value: String(totalWon) },
          { label: 'Deal Aktif', value: String(totalActive) },
          { label: 'Avg Win Rate', value: `${avgWinRate}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{label}</div>
            <div style={{ font: '600 20px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <section style={{ flexShrink: 0 }}>
        <h2 style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-3)' }}>
          Papan Peringkat — {report.length} salesperson
        </h2>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Salesperson', 'Pendapatan', 'Deal Menang', 'Deal Kalah', 'Deal Aktif', 'Win Rate', 'Pipeline', 'Avg Deal'].map((h) => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--fg-3)' }}>Tidak ada data untuk periode ini.</td></tr>
              ) : (
                report.map((row, i) => (
                  <tr
                    key={row.userId}
                    style={{ borderBottom: i < report.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 12px', color: i < 3 ? 'var(--indigo)' : 'var(--fg-3)', font: '600 13px/1', width: 32 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{row.userName}</div>
                      <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{row.userEmail}</div>
                    </td>
                    <td style={{ padding: '10px 12px', font: '600 13px/1 var(--font-mono, monospace)', color: 'var(--teal, #0F7B6C)', whiteSpace: 'nowrap' }}>{formatIDR(row.totalRevenue)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>{row.wonDeals}</td>
                    <td style={{ padding: '10px 12px', color: '#DC2626', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>{row.lostDeals}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>{row.activeDeals}</td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>
                      <WinRateBar pct={row.winRate} />
                    </td>
                    <td style={{ padding: '10px 12px', font: '12px/1 var(--font-mono, monospace)', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatIDR(row.pipelineValue)}</td>
                    <td style={{ padding: '10px 12px', font: '12px/1 var(--font-mono, monospace)', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatIDR(row.avgDealSize)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
