'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent, Mandate, AgentRun, AgentTool } from '@kantorcore/db'

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
  mandates: initialMandates,
  runs,
  availableTools,
}: {
  agent: Agent
  mandates: Mandate[]
  runs: AgentRun[]
  availableTools: AgentTool[]
}) {
  const [agent, setAgent] = useState(initial)
  const [toggling, setToggling] = useState(false)
  const [mandates, setMandates] = useState(initialMandates)
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [mandateError, setMandateError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Run panel
  const [runPrompt, setRunPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const router = useRouter()

  const grantableTools = useMemo(() => {
    const granted = new Set(mandates.map((m) => m.toolName))
    return availableTools.filter((t) => !granted.has(t.name))
  }, [availableTools, mandates])

  async function grantTool(toolName: string) {
    if (granting) return
    setGranting(true)
    setMandateError(null)
    const res = await fetch(`/api/agent/agents/${agent.id}/mandates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName }),
    })
    if (res.ok) {
      const data = (await res.json()) as { mandate: Mandate }
      setMandates((prev) => [...prev, data.mandate])
      setPickerOpen(false)
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setMandateError(data.error ?? 'Gagal memberikan mandat.')
    }
    setGranting(false)
  }

  async function revokeTool(toolName: string) {
    if (revoking) return
    setRevoking(toolName)
    setMandateError(null)
    const res = await fetch(
      `/api/agent/agents/${agent.id}/mandates/${encodeURIComponent(toolName)}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      setMandates((prev) => prev.filter((m) => m.toolName !== toolName))
    } else {
      setMandateError('Gagal mencabut mandat.')
    }
    setRevoking(null)
  }

  async function startRun() {
    if (running || !runPrompt.trim()) return
    setRunning(true)
    setRunError(null)
    const res = await fetch('/api/agent/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id, prompt: runPrompt }),
    })
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) {
      setRunError((data.error as string) ?? 'Gagal menjalankan agen.')
      setRunning(false)
      return
    }
    router.push(`/agent/runs/${data.runId}`)
  }

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
        <Section
          title="Mandat"
          hint="Tool yang boleh dipanggil agen ini"
          action={
            grantableTools.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPickerOpen((v) => !v)
                  setMandateError(null)
                }}
                style={{
                  height: 26,
                  padding: '0 var(--s-3)',
                  border: '1px solid var(--border)',
                  background: pickerOpen ? 'var(--indigo-light)' : 'var(--surface)',
                  color: pickerOpen ? 'var(--indigo)' : 'var(--fg-2)',
                  borderRadius: 'var(--r-sm)',
                  font: '600 11px/1 var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                {pickerOpen ? 'Tutup' : '+ Beri mandat'}
              </button>
            )
          }
        >
          {pickerOpen && (
            <div
              style={{
                marginBottom: 'var(--s-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                background: 'var(--surface)',
                maxHeight: 240,
                overflow: 'auto',
              }}
            >
              {grantableTools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => grantTool(t.name)}
                  disabled={granting}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: 'var(--s-3)',
                    padding: '8px var(--s-3)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: granting ? 'wait' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--fg-2)' }}>
                    {t.name}
                  </span>
                  <span
                    style={{
                      font: '500 10px/1 var(--font-sans)',
                      color: 'var(--fg-3)',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      padding: '2px 5px',
                      borderRadius: 3,
                    }}
                  >
                    {t.module}
                  </span>
                  {t.description && (
                    <span
                      style={{
                        font: '400 12px/1 var(--font-sans)',
                        color: 'var(--fg-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {t.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {availableTools.length === 0 && (
            <Empty>
              Belum ada tool yang terdaftar di ruang kerja. Buka <strong>Pengaturan Agent</strong>
              {' '}untuk menambahkan tool default.
            </Empty>
          )}
          {mandateError && (
            <p style={{ color: 'var(--red)', font: '500 12px/1.4 var(--font-sans)', margin: '0 0 var(--s-3)' }}>
              {mandateError}
            </p>
          )}
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
                  <span style={{ flex: 1 }}>{m.toolName}</span>
                  <button
                    type="button"
                    onClick={() => revokeTool(m.toolName)}
                    disabled={revoking === m.toolName}
                    title="Cabut mandat"
                    style={{
                      height: 22,
                      padding: '0 8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--fg-3)',
                      borderRadius: 3,
                      font: '500 10px/1 var(--font-sans)',
                      cursor: revoking === m.toolName ? 'wait' : 'pointer',
                    }}
                  >
                    {revoking === m.toolName ? '…' : 'Cabut'}
                  </button>
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

        {/* Run panel */}
        <Section title="Jalankan Agen" hint="kirim prompt ke agen">
          {runError && (
            <p style={{ font: '13px/1 var(--font-sans)', color: '#C13D3D', marginBottom: 'var(--s-3)' }}>
              {runError}
            </p>
          )}
          <textarea
            value={runPrompt}
            onChange={(e) => setRunPrompt(e.target.value)}
            placeholder="Apa yang ingin Anda minta dari agen ini?"
            rows={4}
            disabled={running}
            style={{
              width: '100%',
              padding: 'var(--s-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              font: '14px/1.6 var(--font-sans)',
              color: 'var(--fg-1)',
              background: 'var(--bg-1)',
              resize: 'vertical',
              boxSizing: 'border-box',
              marginBottom: 'var(--s-3)',
            }}
          />
          <button
            type="button"
            onClick={startRun}
            disabled={running || !runPrompt.trim() || !agent.enabled}
            style={{
              padding: '8px 20px',
              background: 'var(--indigo)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              font: '600 14px/1 var(--font-sans)',
              cursor: running || !runPrompt.trim() || !agent.enabled ? 'not-allowed' : 'pointer',
              opacity: running || !runPrompt.trim() || !agent.enabled ? 0.6 : 1,
            }}
          >
            {running ? 'Menjalankan…' : 'Jalankan'}
          </button>
          {!agent.enabled && (
            <p style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 'var(--s-2)' }}>
              Aktifkan agen terlebih dahulu.
            </p>
          )}
        </Section>

        {/* Run history */}
        <Section title="Riwayat eksekusi" hint="50 run terakhir">
          {runs.length === 0 ? (
            <Empty>Belum ada run. Trigger pertama via API atau Workflow.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {runs.map((r) => (
                <a
                  key={r.id}
                  href={`/agent/runs/${r.id}`}
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
                    textDecoration: 'none',
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
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
  action,
}: {
  title: string
  hint: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 'var(--s-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
        <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{title}</span>
        {hint && (
          <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</span>
        )}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
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
