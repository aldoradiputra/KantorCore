'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import type { TeamMemberWithStats } from '../../lib/crm-teams'
import { formatIDR, TOOLTIP_STYLE, AXIS_TICK, MONO_TICK } from './_tokens'

function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!
  return `${parts[0]!} ${parts[parts.length - 1]![0]}.`
}

interface Props {
  members: TeamMemberWithStats[]
  metric?: 'revenue' | 'deals'
  height?: number
  teamTarget?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 140 }}>
      <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.fill }}>
          <span>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
            {p.name === 'Menang (Rp)' ? formatIDR(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MemberPerformanceBars({ members, metric = 'revenue', height = 260, teamTarget }: Props) {
  const sorted = [...members].sort((a, b) =>
    metric === 'revenue' ? b.wonRevenue - a.wonRevenue : b.wonDeals - a.wonDeals
  )

  const chartData = sorted.map((m) => ({
    name:        shortName(m.userName),
    'Deal Aktif': m.activeDeals,
    'Menang':     m.wonDeals,
    'Menang (Rp)': m.wonRevenue,
    target:      m.personalTargetRevenue ?? null,
  }))

  const perMemberTarget = teamTarget && members.length > 0
    ? Math.round(teamTarget / members.length)
    : null

  return (
    <ResponsiveContainer width="100%" height={height}>
      {metric === 'revenue' ? (
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatIDR(v)}
            tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={false} tickLine={false} width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
          <Bar dataKey="Menang (Rp)" fill="#0F7B6C" radius={[4, 4, 0, 0]} maxBarSize={48} />
          {perMemberTarget && (
            <ReferenceLine
              y={perMemberTarget}
              stroke="var(--fg-3)"
              strokeDasharray="4 3"
              label={{ value: 'Target rata-rata', position: 'insideTopRight', fontSize: 10, fill: 'var(--fg-3)' }}
            />
          )}
        </BarChart>
      ) : (
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={false} tickLine={false} width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-sans)', paddingTop: 8 }} />
          <Bar dataKey="Deal Aktif" fill="#3B4FC4" fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="Menang" fill="#0F7B6C" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
