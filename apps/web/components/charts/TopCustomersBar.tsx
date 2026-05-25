'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts'
import { formatIDR, TOOLTIP_STYLE, AXIS_TICK, MONO_TICK, SERIES_PALETTE } from './_tokens'

export interface TopCustomerEntry {
  customerName: string
  orderCount:   number
  totalValue:   number
}

interface Props {
  data: TopCustomerEntry[]
  height?: number
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as TopCustomerEntry
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>{d.customerName}</div>
      <div style={{ color: 'var(--fg-3)' }}>{d.orderCount} order</div>
      <div style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(d.totalValue)}</div>
    </div>
  )
}

export function TopCustomersBar({ data, height = 260 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>
        Belum ada pelanggan dengan order.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        barCategoryGap="22%"
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => formatIDR(v)} tick={MONO_TICK} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="customerName"
          width={120}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
        <Bar dataKey="totalValue" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
