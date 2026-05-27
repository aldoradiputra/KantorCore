'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import type { ActivityPoint } from '../../lib/admin'
import { SERIES_PALETTE, AXIS_TICK, TOOLTIP_STYLE } from './_tokens'

interface Props {
  data: ActivityPoint[]
  categories: string[]
  granularity: 'hour' | 'day'
  height?: number
  showLegend?: boolean
}

function fmtBucket(iso: string, granularity: 'hour' | 'day'): string {
  const d = new Date(iso)
  if (granularity === 'hour') {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 140 }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.stroke }}>
          <span style={{ textTransform: 'capitalize' }}>{p.dataKey}</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ActivityTimeline({ data, categories, granularity, height = 240, showLegend = true }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>
        Belum ada aktivitas.
      </div>
    )
  }

  const chartData = data.map((p) => ({
    ...p,
    bucket: fmtBucket(p.bucket as string, granularity),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <defs>
          {categories.map((cat, i) => (
            <linearGradient key={cat} id={`grad-act-${cat}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={SERIES_PALETTE[i % SERIES_PALETTE.length]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={SERIES_PALETTE[i % SERIES_PALETTE.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          allowDecimals={false}
          tick={{ ...AXIS_TICK, fontSize: 10 }}
          axisLine={false} tickLine={false} width={28}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}>
                {value}
              </span>
            )}
            wrapperStyle={{ paddingTop: 8 }}
          />
        )}
        {categories.map((cat, i) => (
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={SERIES_PALETTE[i % SERIES_PALETTE.length]}
            strokeWidth={2}
            fill={`url(#grad-act-${cat})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
