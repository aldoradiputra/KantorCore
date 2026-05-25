'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, CartesianGrid,
} from 'recharts'

function formatIDR(v: number) {
  if (v === 0) return 'Rp 0'
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`
  return 'Rp ' + v.toLocaleString('id-ID')
}

export interface WaterfallData {
  bestCase: number
  expectedCase: number
  worstCase: number
  closedRevenue: number
  target: number
  periodLabel: string
}

interface Props {
  data: WaterfallData
  height?: number
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', font: '12px/1.5 var(--font-sans)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>{item.payload.label}</div>
      <div style={{ color: item.fill, fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(item.value)}</div>
    </div>
  )
}

export function ForecastWaterfall({ data, height = 240 }: Props) {
  const chartData = [
    { label: 'Worst Case',   value: data.worstCase,    fill: '#D97706', key: 'worst' },
    { label: 'Expected',     value: data.expectedCase, fill: '#3B4FC4', key: 'expected' },
    { label: 'Best Case',    value: data.bestCase,     fill: '#6B7280', key: 'best' },
    { label: 'Sudah Tutup',  value: data.closedRevenue, fill: '#0F7B6C', key: 'closed' },
  ]

  const maxVal = Math.max(data.bestCase, data.target, 1)

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 80, bottom: 4, left: 8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, maxVal * 1.1]}
            tickFormatter={(v) => formatIDR(v)}
            tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fontSize: 11, fill: 'var(--fg-2)', fontFamily: 'var(--font-sans)' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} fillOpacity={0.9} />
            ))}
          </Bar>
          {data.target > 0 && (
            <ReferenceLine
              x={data.target}
              stroke="var(--fg-3)"
              strokeDasharray="5 4"
              label={{
                value: `Target ${formatIDR(data.target)}`,
                position: 'right',
                fontSize: 10,
                fill: 'var(--fg-3)',
                fontFamily: 'var(--font-sans)',
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
