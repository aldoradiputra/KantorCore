'use client'

import { useRouter, usePathname, useSearchParams, } from 'next/navigation'
import { useCallback } from 'react'
import type { ForecastResult, UtmBreakdown } from '../../../lib/crm-forecast'
import type { DealStage } from '../../../lib/crm'
import type { TrendPoint } from '../../../components/charts/StageValueTrend'
import { ForecastWaterfall, StageValueTrend, UtmSourceDonut, ChartCard } from '../../../components/charts'

const STAGE_LABEL: Record<DealStage, string> = {
  lead: 'Prospek', qualified: 'Terverifikasi', proposal: 'Penawaran',
  negotiation: 'Negosiasi', won: 'Menang', lost: 'Kalah',
}

const STAGE_COLOR: Record<DealStage, string> = {
  lead: '#6B7280', qualified: '#3B4FC4', proposal: '#7C3AED',
  negotiation: '#B35A00', won: '#0F7B6C', lost: '#DC2626',
}

const PRESETS = [
  { value: 'this_month',   label: 'Bulan Ini' },
  { value: 'next_month',   label: 'Bulan Depan' },
  { value: 'this_quarter', label: 'Kuartal Ini' },
  { value: 'next_quarter', label: 'Kuartal Depan' },
  { value: 'this_year',    label: 'Tahun Ini' },
]

function formatIDR(v: number) {
  if (v === 0) return 'Rp 0'
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`
  return 'Rp ' + v.toLocaleString('id-ID')
}

interface Props {
  forecast: ForecastResult
  teams: { id: string; name: string }[]
  trend: TrendPoint[]
  utmData: UtmBreakdown[]
  selectedTeamId: string | null
  selectedPreset: string
}

export default function ForecastClient({ forecast, teams, trend, utmData, selectedTeamId, selectedPreset }: Props) {
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

  const f = forecast
  const openStages = f.byStage.filter((s) => s.stage !== 'lost')
  const maxStageValue = Math.max(...openStages.map((s) => s.totalValue), 1)

  const coveragePct = f.target > 0 ? Math.min(200, Math.round(f.expectedCase / f.target * 100)) : null

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 1100, height: '100%', overflowY: 'auto' }}>
      {/* Header + controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)', flexWrap: 'wrap', flexShrink: 0 }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Forecast Penjualan</h1>
          <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>{f.period.label}</p>
        </div>

        {/* Date selection widget */}
        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          {/* Team filter */}
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

          {/* Preset pills */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => navigate({ preset: p.value, start: null, end: null })}
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

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s-3)', flexShrink: 0 }}>
        {[
          { label: 'Best Case', value: formatIDR(f.bestCase), sub: '100% semua deal terbuka', color: 'var(--indigo)' },
          { label: 'Expected', value: formatIDR(f.expectedCase), sub: 'Tertimbang probabilitas', color: 'var(--teal, #0F7B6C)' },
          { label: 'Worst Case', value: formatIDR(f.worstCase), sub: 'Probabilitas minimum per tahap', color: 'var(--amber, #B35A00)' },
          { label: 'Sudah Ditutup', value: formatIDR(f.closedRevenue), sub: 'Deal menang dalam periode', color: '#065F46' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
            <div style={{ font: `600 18px/1 var(--font-mono, monospace)`, color }}>{value}</div>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Target coverage */}
      {f.target > 0 && (
        <div style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, font: '13px/1 var(--font-sans)' }}>
            <span style={{ color: 'var(--fg-2)', fontWeight: 600 }}>vs Target Tim</span>
            <span style={{ color: 'var(--fg-3)' }}>{formatIDR(f.expectedCase)} / {formatIDR(f.target)} ({coveragePct ?? 0}%)</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            {/* Best case bar (lighter) */}
            <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, f.target > 0 ? f.bestCase / f.target * 100 : 0)}%`, background: 'var(--indigo-light)', borderRadius: 4 }} />
            {/* Expected bar */}
            <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, coveragePct ?? 0)}%`, background: (coveragePct ?? 0) >= 100 ? 'var(--teal, #0F7B6C)' : 'var(--indigo)', borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* Waterfall + Pipeline trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', flexShrink: 0 }}>
        <ChartCard title="Best / Expected / Worst vs Target">
          <ForecastWaterfall
            data={{
              bestCase:      f.bestCase,
              expectedCase:  f.expectedCase,
              worstCase:     f.worstCase,
              closedRevenue: f.closedRevenue,
              target:        f.target,
              periodLabel:   f.period.label,
            }}
            height={220}
          />
        </ChartCard>
        <ChartCard title="Tren Pipeline (8 minggu)">
          <StageValueTrend data={trend} height={220} />
        </ChartCard>
      </div>

      {/* UTM donut */}
      {utmData.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <ChartCard title="Atribusi Sumber (UTM)" subtitle="Nilai deal per saluran">
            <UtmSourceDonut data={utmData} metric="revenue" height={220} />
          </ChartCard>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-5)' }}>
        {/* Pipeline by stage */}
        <section>
          <h2 style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-3)' }}>Per Tahap Pipeline</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 'var(--s-4)' }}>
            {openStages.length === 0 ? (
              <div style={{ color: 'var(--fg-3)', font: '13px/1 var(--font-sans)', textAlign: 'center', padding: 'var(--s-4)' }}>Tidak ada deal dalam periode ini.</div>
            ) : (
              openStages.map((s) => (
                <div key={s.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, font: '12px/1 var(--font-sans)' }}>
                    <span style={{ color: STAGE_COLOR[s.stage as DealStage] ?? 'var(--fg-2)', fontWeight: 600 }}>
                      {STAGE_LABEL[s.stage as DealStage] ?? s.stage}
                    </span>
                    <span style={{ color: 'var(--fg-3)' }}>{s.count} deal · {formatIDR(s.totalValue)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(s.totalValue / maxStageValue * 100)}%`, background: STAGE_COLOR[s.stage as DealStage] ?? 'var(--indigo)', borderRadius: 3 }} />
                  </div>
                  <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>
                    Tertimbang: {formatIDR(s.weightedValue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* By salesperson */}
        <section>
          <h2 style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-3)' }}>Per Salesperson</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {f.bySalesperson.length === 0 ? (
              <div style={{ padding: 'var(--s-5)', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)', textAlign: 'center' }}>Belum ada data.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1 var(--font-sans)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Salesperson', 'Expected', 'Best Case', 'Menang'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {f.bySalesperson.map((sp, i) => (
                    <tr key={sp.userId} style={{ borderBottom: i < f.bySalesperson.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--fg-1)', fontWeight: 500 }}>{sp.userName}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--teal, #0F7B6C)', fontWeight: 600, font: '12px/1 var(--font-mono, monospace)' }}>{formatIDR(sp.expectedCase)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg-2)', font: '12px/1 var(--font-mono, monospace)' }}>{formatIDR(sp.bestCase)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg-3)', font: '12px/1 var(--font-mono, monospace)' }}>{formatIDR(sp.closedRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

