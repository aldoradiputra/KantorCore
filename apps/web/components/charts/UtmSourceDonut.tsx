'use client'

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const PALETTE = [
  '#3B4FC4', '#0F7B6C', '#B35A00', '#7C3AED', '#DC2626',
  '#0891B2', '#65A30D', '#DB2777', '#9333EA', '#6B7280',
]

function formatIDR(v: number) {
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(0)}jt`
  return 'Rp' + v.toLocaleString('id-ID')
}

export interface UtmEntry {
  source: string
  dealCount: number
  revenue: number
}

interface Props {
  data: UtmEntry[]
  metric?: 'revenue' | 'count'
  height?: number
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as UtmEntry & { pct: number }
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', font: '12px/1.5 var(--font-sans)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>{d.source || '(langsung)'}</div>
      <div style={{ color: 'var(--fg-2)' }}>{d.dealCount} deal</div>
      <div style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(d.revenue)}</div>
      <div style={{ color: 'var(--fg-3)', marginTop: 4 }}>{d.pct}% dari total</div>
    </div>
  )
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) {
  if (pct < 5) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
      {pct}%
    </text>
  )
}

export function UtmSourceDonut({ data, metric = 'revenue', height = 240 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>
        Tidak ada data atribusi.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + (metric === 'revenue' ? d.revenue : d.dealCount), 0) || 1
  const chartData = data
    .sort((a, b) => b[metric === 'revenue' ? 'revenue' : 'dealCount'] - a[metric === 'revenue' ? 'revenue' : 'dealCount'])
    .slice(0, 9)
    .map((d) => ({
      ...d,
      value: metric === 'revenue' ? d.revenue : d.dealCount,
      pct: Math.round((metric === 'revenue' ? d.revenue : d.dealCount) / total * 100),
      name: d.source || '(langsung)',
    }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          dataKey="value"
          paddingAngle={2}
          labelLine={false}
          label={<CustomLabel />}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-sans)' }}>{value}</span>}
          wrapperStyle={{ paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
