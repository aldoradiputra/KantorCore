'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { formatIDR, TOOLTIP_STYLE, AXIS_TICK, MONO_TICK } from './_tokens'

export interface RevenueStackPoint {
  week:      string
  quotation: number
  confirmed: number
  done:      number
}

const STACK_COLORS = {
  quotation: '#6B7280',
  confirmed: '#3B4FC4',
  done:      '#0F7B6C',
}

const STACK_LABEL = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
}

interface Props {
  data: RevenueStackPoint[]
  height?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + p.value, 0)
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 180 }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: p.fill }}>
          <span>{STACK_LABEL[p.dataKey as keyof typeof STACK_LABEL] ?? p.dataKey}</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(p.value)}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', color: 'var(--fg-2)' }}>
        <span style={{ fontWeight: 600 }}>Total</span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{formatIDR(total)}</span>
      </div>
    </div>
  )
}

export function RevenueStackedTrend({ data, height = 260 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>
        Belum ada data penjualan untuk periode ini.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap="22%">
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatIDR(v)} tick={MONO_TICK} axisLine={false} tickLine={false} width={56} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-sans)' }}>
              {STACK_LABEL[value as keyof typeof STACK_LABEL] ?? value}
            </span>
          )}
          wrapperStyle={{ paddingTop: 8 }}
        />
        <Bar dataKey="quotation" stackId="a" fill={STACK_COLORS.quotation} maxBarSize={40} />
        <Bar dataKey="confirmed" stackId="a" fill={STACK_COLORS.confirmed} maxBarSize={40} />
        <Bar dataKey="done"      stackId="a" fill={STACK_COLORS.done}      maxBarSize={40} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
