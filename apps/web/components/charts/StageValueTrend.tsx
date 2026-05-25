'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import type { DealStage } from '../../lib/crm'
import { STAGE_LABEL, STAGE_COLOR, formatIDR, TOOLTIP_STYLE, AXIS_TICK, MONO_TICK } from './_tokens'

export interface TrendPoint {
  week: string   // e.g. "Mei W3"
  [stage: string]: number | string
}

interface Props {
  data: TrendPoint[]
  stages?: DealStage[]
  height?: number
}

const DEFAULT_STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 160 }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.stroke }}>
          <span>{STAGE_LABEL[p.dataKey as DealStage] ?? p.dataKey}</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function StageValueTrend({ data, stages = DEFAULT_STAGES, height = 260 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>
        Tidak ada data tren.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <defs>
          {stages.map((s) => (
            <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={STAGE_COLOR[s]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={STAGE_COLOR[s]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatIDR(v)}
          tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
          axisLine={false} tickLine={false} width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-sans)' }}>
              {STAGE_LABEL[value as DealStage] ?? value}
            </span>
          )}
          wrapperStyle={{ paddingTop: 8 }}
        />
        {stages.map((s) => (
          <Area
            key={s}
            type="monotone"
            dataKey={s}
            stroke={STAGE_COLOR[s]}
            strokeWidth={2}
            fill={`url(#grad-${s})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
