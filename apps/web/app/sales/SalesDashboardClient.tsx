'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import {
  ChartCard, RevenueStackedTrend, TopCustomersBar, PipelineFunnel,
  formatIDR,
} from '../../components/charts'
import type {
  StatusBucket, RevenuePoint, TopCustomer, SalespersonStat, SalesKpis,
} from '../../lib/sales-dashboard'
import type { SoStatus } from '../../lib/sales'

const STATUS_LABEL: Record<SoStatus, string> = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}

interface Props {
  teams:          { id: string; name: string }[]
  selectedTeamId: string | null
  kpis:           SalesKpis
  statusSummary:  StatusBucket[]
  trend:          RevenuePoint[]
  topCustomers:   TopCustomer[]
  salespeople:    SalespersonStat[]
}

export default function SalesDashboardClient({
  teams, selectedTeamId, kpis, statusSummary, trend, topCustomers, salespeople,
}: Props) {
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

  // Map status summary into funnel-compatible shape (using DealStage-like keys)
  const funnelLikeData = statusSummary.map((b) => ({
    stage:      b.status === 'done' ? ('won' as const)
              : b.status === 'cancelled' ? ('lost' as const)
              : b.status === 'confirmed' ? ('negotiation' as const)
              : ('qualified' as const),
    count:      b.count,
    totalValue: b.totalValue,
  }))

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 1200, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)', flexWrap: 'wrap', flexShrink: 0 }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Dashboard Penjualan</h1>
          <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>Ringkasan pipeline dan performa penjualan</p>
        </div>
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
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--s-3)', flexShrink: 0 }}>
        <Kpi label="Order"      value={String(kpis.totalOrders)} />
        <Kpi label="Pendapatan" value={formatIDR(kpis.totalRevenue)} color="var(--teal, #0F7B6C)" />
        <Kpi label="Avg Order"  value={formatIDR(kpis.avgOrderValue)} />
        <Kpi label="Konversi"   value={`${kpis.conversionRate}%`} color="var(--indigo)" />
        <Kpi label="Penawaran Terbuka" value={formatIDR(kpis.openQuotationVal)} color="var(--amber, #B35A00)" />
      </div>

      {/* Charts row 1: Trend + Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--s-4)', flexShrink: 0 }}>
        <ChartCard title="Tren Pendapatan (12 minggu)" subtitle="Stacked per status">
          <RevenueStackedTrend data={trend} height={240} />
        </ChartCard>
        <ChartCard title="Distribusi Status">
          <PipelineFunnel data={funnelLikeData} metric="value" height={240} />
        </ChartCard>
      </div>

      {/* Charts row 2: Top customers + Salesperson */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', flexShrink: 0 }}>
        <ChartCard title="Pelanggan Teratas">
          <TopCustomersBar data={topCustomers} height={240} />
        </ChartCard>

        <ChartCard title="Per Salesperson">
          {salespeople.length === 0 ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>
              Belum ada order yang ditugaskan.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', maxHeight: 240, overflowY: 'auto' }}>
              {salespeople.map((sp, i) => {
                const pct = kpis.totalRevenue > 0 ? Math.round(sp.totalValue / kpis.totalRevenue * 100) : 0
                return (
                  <div key={sp.userId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', font: '12px/1 var(--font-sans)', marginBottom: 4 }}>
                      <span style={{ color: 'var(--fg-1)', fontWeight: i < 3 ? 600 : 500 }}>
                        {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{sp.userName}
                      </span>
                      <span style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(sp.totalValue)}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--indigo)', borderRadius: 2 }} />
                    </div>
                    <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>
                      {sp.orderCount} order · {formatIDR(sp.wonValue)} selesai
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function Kpi({ label, value, color = 'var(--fg-1)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ font: '600 18px/1 var(--font-mono, monospace)', color }}>{value}</div>
    </div>
  )
}
