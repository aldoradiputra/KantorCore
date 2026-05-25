'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts'

const BUCKETS = [
  { label: '0–20%',  min: 0,  max: 20 },
  { label: '21–40%', min: 21, max: 40 },
  { label: '41–60%', min: 41, max: 60 },
  { label: '61–80%', min: 61, max: 80 },
  { label: '81–99%', min: 81, max: 99 },
  { label: '100%',   min: 100, max: 100 },
]

const BUCKET_COLORS = ['#DC2626', '#B35A00', '#6B7280', '#3B4FC4', '#7C3AED', '#0F7B6C']

function formatIDR(v: number) {
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(0)}jt`
  if (v === 0) return '—'
  return 'Rp' + v.toLocaleString('id-ID')
}

export interface ProbabilityDeal {
  probability: number
  expectedValue: number
}

interface Props {
  deals: ProbabilityDeal[]
  metric?: 'count' | 'value'
  height?: number
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', font: '12px/1.5 var(--font-sans)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>{d.label}</div>
      <div style={{ color: 'var(--fg-2)' }}>{d.count} deal</div>
      <div style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(d.totalValue)}</div>
    </div>
  )
}

export function ProbabilityHistogram({ deals, metric = 'count', height = 200 }: Props) {
  const chartData = BUCKETS.map((bucket, i) => {
    const matching = deals.filter((d) =>
      d.probability >= bucket.min && d.probability <= bucket.max
    )
    return {
      label: bucket.label,
      count: matching.length,
      totalValue: matching.reduce((s, d) => s + d.expectedValue, 0),
      value: metric === 'count' ? matching.length : matching.reduce((s, d) => s + d.expectedValue, 0),
      color: BUCKET_COLORS[i],
    }
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={metric === 'value' ? (v) => formatIDR(v) : undefined}
          tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
          axisLine={false} tickLine={false} width={metric === 'value' ? 52 : 24}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={52}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? '#6B7280'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
