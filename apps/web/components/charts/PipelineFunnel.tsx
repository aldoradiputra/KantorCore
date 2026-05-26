'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts'
import type { DealStage } from '../../lib/crm'
import { STAGE_LABEL, STAGE_COLOR, STAGE_ORDER, formatIDR, TOOLTIP_STYLE, AXIS_TICK } from './_tokens'

export interface FunnelStage {
  stage: DealStage
  count: number
  totalValue: number
}

interface Props {
  data: FunnelStage[]
  height?: number
  metric?: 'count' | 'value'
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as FunnelStage
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>{STAGE_LABEL[d.stage]}</div>
      <div style={{ color: 'var(--fg-3)' }}>{d.count} deal</div>
      <div style={{ color: 'var(--fg-2)' }}>{formatIDR(d.totalValue)}</div>
    </div>
  )
}

export function PipelineFunnel({ data, height = 220, metric = 'count' }: Props) {
  const ordered = STAGE_ORDER
    .map((s) => data.find((d) => d.stage === s))
    .filter(Boolean) as FunnelStage[]

  const chartData = ordered.map((d) => ({
    ...d,
    label: STAGE_LABEL[d.stage],
    value: metric === 'count' ? d.count : d.totalValue,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} barCategoryGap="20%">
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={false} tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {chartData.map((entry) => (
            <Cell key={entry.stage} fill={STAGE_COLOR[entry.stage]} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: string | number) => metric === 'count' ? v : formatIDR(Number(v))}
            style={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
