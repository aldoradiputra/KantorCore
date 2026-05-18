'use client'

import { useState } from 'react'
import type { Agent, Mandate, AgentRun } from '@kantorcore/db'

const RUN_STATUS_COLOR: Record<string, string> = {
  pending: 'var(--fg-3)',
  running: 'var(--indigo)',
  done: 'var(--teal)',
  failed: '#C13D3D',
  awaiting_approval: 'var(--amber)',
  approved: 'var(--teal)',
  rejected: '#C13D3D',
}

const RUN_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan',
  done: 'Selesai',
  failed: 'Gagal',
  awaiting_approval: 'Perlu persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export default function AgentDetail({
  agent: initial,
  mandates,
  runs,
}: {
  agent: Agent
  mandates: Mandate[]
  runs: AgentRun[]
}) {
  const [agent, setAgent] = useState(initial)
  const [toggling, setToggling] = useState(false)

  async function toggleEnabled() {
    if (toggling) return
    setToggling(true)
    const res = await fetch(`/api/agent/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !agent.enabled }),
    })
    if (res.ok) {
      const data = (await res.json()) as { agent: Agent }
      setAgent(data.agent)
    }
    setToggling(false)
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--s-6) var(--content-gutter)',
      }}
    >
      <div style={{ maxWidth: 720, width: '100%' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 'var(--s-5)',
            gap: 'var(--s-3)',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{agent.name}</h2>
            {agent.description && (
              <p style={{ margin: '4px 0 0', font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
                {agent.description}
              </p>
            )}
            <div
              style={{
                marginTop: 'var(--s-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                font: '500 11px/1 var(--font-mono)',
                color: 'var(--fg-3)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                padding: '4px 8px',
                borderRadius: 4,
              }}
            >
              {agent.model}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleEnabled}
            disabled={toggling}
            style={{
              height: 32,
              padding: '0 var(--s-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              background: agent.enabled ? 'var(--teal-light)' : 'var(--bg)',
              color: agent.enabled ? 'var(--teal)' : 'var(--fg-3)',
              font: '600 12px/1 var(--font-sans)',
              cursor: toggling ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            {agent.enabled ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>

        {/* Mandates */}
        <Section title="Mandat" hint="Tool yang boleh dipanggil agen ini">
          {mandates.length === 0 ? (
            <Empty>
              Belum ada mandat. Agen tidak bisa melakukan apa pun sampai Anda memberikan izin tool.
            </Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mandates.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--s-3)',
                    padding: '8px var(--s-3)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    font: '500 12px/1 var(--font-mono)',
                    color: 'var(--fg-2)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--teal)',
                      flexShrink: 0,
                    }}
                  />
                  {m.toolName}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* System prompt */}
        {agent.systemPrompt && (
          <Section title="System prompt" hint="">
            <pre
              style={{
                font: '400 12px/1.6 var(--font-mono)',
                color: 'var(--fg-2)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: 'var(--s-3)',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {agent.systemPrompt}
            </pre>
          </Section>
        )}

        {/* Run history */}
        <Section title="Riwayat eksekusi" hint="50 run terakhir">
          {runs.length === 0 ? (
            <Empty>Belum ada run. Trigger pertama via API atau Workflow.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {runs.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 160px',
                    gap: 'var(--s-3)',
                    alignItems: 'center',
                    padding: '8px var(--s-3)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    font: '400 12px/1 var(--font-sans)',
                    color: 'var(--fg-2)',
                  }}
                >
                  <span
                    style={{
                      font: '500 11px/1 var(--font-mono)',
                      color: 'var(--fg-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.id.slice(0, 8)}…
                  </span>
                  <span style={{ color: RUN_STATUS_COLOR[r.status] ?? 'var(--fg-3)', fontWeight: 600 }}>
                    {RUN_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span style={{ color: 'var(--fg-3)', font: '400 11px/1 var(--font-sans)' }}>
                    {new Date(r.createdAt).toLocaleString('id-ID', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s-6)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
        <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{title}</span>
        {hint && (
          <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
      {children}
    </p>
  )
}
