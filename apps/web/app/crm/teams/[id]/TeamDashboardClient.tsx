'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { TeamWithMembers, TeamMemberWithStats, TeamPerformanceSummary, AssignmentRule } from '../../../../lib/crm-teams'

function formatIDR(v: number) {
  if (v === 0) return '—'
  return 'Rp ' + v.toLocaleString('id-ID')
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '16px 18px', background: 'var(--bg)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ font: '600 20px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{value}</div>
      {sub && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{sub}</div>}
    </div>
  )
}

interface Props {
  team: TeamWithMembers
  performance: TeamPerformanceSummary | null
  rules: AssignmentRule[]
}

export default function TeamDashboardClient({ team, performance, rules }: Props) {
  const [assigning, setAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState<string | null>(null)

  const perf = performance
  const targetPct = perf && perf.targetRevenue > 0
    ? Math.min(100, Math.round(perf.wonRevenue / perf.targetRevenue * 100))
    : null

  async function triggerAssignment(ruleId?: string) {
    setAssigning(true)
    setAssignResult(null)
    try {
      const res = await fetch(`/api/crm/teams/${team.id}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      })
      const data = await res.json()
      if (res.ok) {
        setAssignResult(`${data.assigned} lead berhasil ditugaskan.`)
      } else {
        setAssignResult(data.error ?? 'Gagal menjalankan penugasan.')
      }
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-6)', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', marginBottom: 4 }}>
            <Link href="/crm/teams" style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>Tim Sales</Link>
            <span style={{ color: 'var(--fg-3)' }}>/</span>
            <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{team.name}</span>
          </div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{team.name}</h1>
          {team.leaderName && (
            <div style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 6 }}>
              Pemimpin: {team.leaderName} · {team.assignmentFrequency === 'daily' ? 'Harian' : team.assignmentFrequency === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s-2)', flexShrink: 0 }}>
          <button
            onClick={() => triggerAssignment()}
            disabled={assigning}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--indigo)',
              color: 'white',
              font: '600 13px/1 var(--font-sans)',
              border: 'none',
              cursor: assigning ? 'not-allowed' : 'pointer',
              opacity: assigning ? 0.6 : 1,
            }}
          >
            {assigning ? 'Menugaskan…' : '⚡ Tugaskan Lead'}
          </button>
        </div>
      </div>

      {assignResult && (
        <div style={{ padding: '10px 14px', background: 'var(--teal-light, var(--indigo-light))', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--teal, var(--indigo))' }}>
          {assignResult}
        </div>
      )}

      {/* KPI row */}
      {perf && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--s-3)' }}>
          <StatCard label="Lead Masuk" value={String(perf.totalLeads)} />
          <StatCard label="Deal Aktif" value={String(perf.activeDeals)} />
          <StatCard label="Deal Menang" value={String(perf.wonDeals)} />
          <StatCard label="Pendapatan" value={formatIDR(perf.wonRevenue)} />
          <StatCard
            label="Pipeline Tertimbang"
            value={formatIDR(perf.pipelineValue)}
            sub="prob × nilai"
          />
        </div>
      )}

      {/* Progress toward target */}
      {targetPct !== null && perf && (
        <div style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, font: '13px/1 var(--font-sans)' }}>
            <span style={{ color: 'var(--fg-2)', fontWeight: 600 }}>Pencapaian Target</span>
            <span style={{ color: 'var(--fg-3)' }}>{formatIDR(perf.wonRevenue)} / {formatIDR(perf.targetRevenue)} ({targetPct}%)</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${targetPct}%`, background: targetPct >= 100 ? 'var(--teal)' : 'var(--indigo)', borderRadius: 3, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* Member performance table */}
      <section>
        <h2 style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-3)' }}>
          Anggota Tim ({team.members.length})
        </h2>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['Anggota', 'Peran', 'Lead Ditugaskan', 'Deal Aktif', 'Deal Menang', 'Pendapatan', 'Target Pribadi'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--fg-3)' }}>
                    Belum ada anggota.
                  </td>
                </tr>
              ) : (
                team.members
                  .sort((a, b) => b.wonRevenue - a.wonRevenue)
                  .map((member, i) => (
                    <MemberRow key={member.userId} member={member} rank={i + 1} />
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Assignment rules */}
      {rules.length > 0 && (
        <section>
          <h2 style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-3)' }}>
            Aturan Penugasan
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {rules.map((rule) => (
              <div key={rule.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
              }}>
                <div>
                  <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{rule.name}</div>
                  <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
                    {rule.ruleType === 'round_robin' ? 'Round Robin' : rule.ruleType === 'load_balanced' ? 'Load Balanced' : rule.ruleType === 'rule_based' ? 'Berbasis Aturan' : 'Manual'}
                    {rule.lastTriggeredAt && ` · Terakhir: ${new Date(rule.lastTriggeredAt).toLocaleDateString('id-ID')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                  <div style={{
                    padding: '3px 8px', borderRadius: 'var(--r-sm)',
                    background: rule.isActive ? 'var(--teal-light, #D1FAE5)' : 'var(--bg)',
                    font: '11px/1 var(--font-sans)', color: rule.isActive ? 'var(--teal, #065F46)' : 'var(--fg-3)',
                  }}>
                    {rule.isActive ? 'Aktif' : 'Nonaktif'}
                  </div>
                  <button
                    onClick={() => triggerAssignment(rule.id)}
                    disabled={assigning}
                    style={{ padding: '5px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--surface)', font: '12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}
                  >
                    Jalankan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MemberRow({ member, rank }: { member: TeamMemberWithStats; rank: number }) {
  function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
  }

  const isLeader = member.role === 'leader'

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
    >
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: isLeader ? 'var(--indigo)' : 'var(--bg)',
            border: `2px solid ${isLeader ? 'var(--indigo)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            font: '600 10px/1 var(--font-sans)', color: isLeader ? 'white' : 'var(--fg-2)', flexShrink: 0,
          }}>
            {initials(member.userName)}
          </div>
          <div>
            <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{member.userName}</div>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{member.userEmail}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 'var(--r-sm)',
          background: isLeader ? 'var(--indigo-light)' : 'var(--bg)',
          font: '11px/1 var(--font-sans)', color: isLeader ? 'var(--indigo)' : 'var(--fg-3)',
        }}>
          {isLeader ? 'Pemimpin' : 'Anggota'}
        </span>
      </td>
      <td style={{ padding: '10px 14px', color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>{member.assignedLeads}</td>
      <td style={{ padding: '10px 14px', color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>{member.activeDeals}</td>
      <td style={{ padding: '10px 14px', color: 'var(--teal, #0F7B6C)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{member.wonDeals}</td>
      <td style={{ padding: '10px 14px', color: 'var(--fg-1)', font: '600 13px/1 var(--font-mono, monospace)' }}>
        {member.wonRevenue > 0 ? 'Rp ' + member.wonRevenue.toLocaleString('id-ID') : '—'}
      </td>
      <td style={{ padding: '10px 14px', color: 'var(--fg-3)', font: '12px/1 var(--font-mono, monospace)' }}>
        {member.personalTargetRevenue ? 'Rp ' + member.personalTargetRevenue.toLocaleString('id-ID') : '—'}
      </td>
    </tr>
  )
}
