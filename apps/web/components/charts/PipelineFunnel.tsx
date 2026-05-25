'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts'
import type { DealStage } from '../../lib/crm'

const STAGE_LABEL: Record<DealStage, string> = {
  lead: 'Prospek', qualified: 'Terverifikasi', proposal: 'Penawaran',
  negotiation: 'Negosiasi', won: 'Menang', lost: 'Kalah',
}
const STAGE_COLOR: Record<DealStage, string> = {
  lead: '#6B7280', qualified: '#3B4FC4', proposal: '#7C3AED',
  negotiation: '#B35A00', won: '#0F7B6C', lost: '#DC2626',
}

function formatIDR(v: number) {
  if (v === 0) return '—'
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(0)}jt`
  return 'Rp' + v.toLocaleString('id-ID')
}

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

const STAGE_ORDER: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as FunnelStage
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', font: '12px/1.5 var(--font-sans)',
    }}>
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
          tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}
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
            formatter={(v: number) => metric === 'count' ? v : formatIDR(v)}
            style={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
