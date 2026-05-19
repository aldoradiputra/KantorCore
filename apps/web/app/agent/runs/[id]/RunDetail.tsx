'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { AgentRun } from '@kantorcore/db'
import type { ToolCallEvent } from '../../../../lib/agent-runner'

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--fg-3)',
  running: 'var(--indigo)',
  done: 'var(--teal)',
  failed: '#C13D3D',
  awaiting_approval: 'var(--amber)',
  approved: 'var(--indigo)',
  rejected: '#C13D3D',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan…',
  done: 'Selesai',
  failed: 'Gagal',
  awaiting_approval: 'Perlu persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

const ACTIVE_STATUSES = new Set(['pending', 'running'])

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--fg-3)'
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  )
}

function ToolCallCard({ tc }: { tc: ToolCallEvent }) {
  const [open, setOpen] = useState(false)
  const hasOutput = tc.output !== undefined || tc.error !== undefined
  const icon = tc.error ? '✗' : hasOutput ? '✓' : '…'
  const iconColor = tc.error ? '#C13D3D' : hasOutput ? 'var(--teal)' : 'var(--fg-3)'

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        overflow: 'hidden',
        marginBottom: 'var(--s-2)',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-2)',
          padding: 'var(--s-2) var(--s-3)',
          background: 'var(--bg-2)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ font: '13px/1 var(--font-mono)', color: iconColor, width: 14 }}>{icon}</span>
        <span style={{ font: '13px/1 var(--font-mono)', color: 'var(--fg-1)', flex: 1 }}>
          {tc.toolName}
        </span>
        {tc.requiresApproval && (
          <span
            style={{
              font: '11px/1 var(--font-sans)',
              color: 'var(--amber)',
              background: 'var(--amber-light, #FFF8E7)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            perlu persetujuan
          </span>
        )}
        <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{ padding: 'var(--s-3)', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 'var(--s-2)' }}>
            <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>
              Input
            </span>
            <pre
              style={{
                font: '12px/1.5 var(--font-mono)',
                color: 'var(--fg-1)',
                background: 'var(--bg-2)',
                padding: 'var(--s-2)',
                borderRadius: 'var(--r-sm)',
                overflow: 'auto',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(tc.input, null, 2)}
            </pre>
          </div>
          {hasOutput && (
            <div>
              <span style={{ font: '11px/1 var(--font-sans)', color: tc.error ? '#C13D3D' : 'var(--fg-3)', display: 'block', marginBottom: 4 }}>
                {tc.error ? 'Error' : 'Output'}
              </span>
              <pre
                style={{
                  font: '12px/1.5 var(--font-mono)',
                  color: tc.error ? '#C13D3D' : 'var(--fg-1)',
                  background: 'var(--bg-2)',
                  padding: 'var(--s-2)',
                  borderRadius: 'var(--r-sm)',
                  overflow: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {tc.error ?? JSON.stringify(tc.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RunDetail({
  initialRun,
  initialToolCalls,
  agentName,
  agentId,
}: {
  initialRun: AgentRun
  initialToolCalls: ToolCallEvent[]
  agentName: string
  agentId: string
}) {
  const [run, setRun] = useState(initialRun)
  const [toolCalls, setToolCalls] = useState(initialToolCalls)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const poll = useCallback(async () => {
    const res = await fetch(`/api/agent/runs/${run.id}`)
    if (!res.ok) return
    const data = await res.json()
    setRun(data.run)
    setToolCalls(data.toolCalls ?? [])
  }, [run.id])

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(run.status)) return
    const t = setInterval(poll, 2000)
    return () => clearInterval(t)
  }, [run.status, poll])

  async function handleApprove() {
    setApproving(true)
    setActionError(null)
    const res = await fetch(`/api/agent/runs/${run.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await res.json()
    if (!res.ok) { setActionError(data.error); setApproving(false); return }
    await poll()
    setApproving(false)
  }

  async function handleReject() {
    setRejecting(true)
    setActionError(null)
    const res = await fetch(`/api/agent/runs/${run.id}/reject`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setActionError(data.error); setRejecting(false); return }
    await poll()
    setRejecting(false)
  }

  const output = run.output as Record<string, unknown> | null
  const outputText = output?.text as string | null

  return (
    <div style={{ maxWidth: 720, padding: 'var(--s-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
        <Link href={`/agent/${agentId}`} style={{ font: '13px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
          ← {agentName}
        </Link>
      </div>

      <h1 style={{ font: '700 20px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-2)' }}>
        Run
        <span style={{ font: '13px/1 var(--font-mono)', color: 'var(--fg-3)', marginLeft: 10, fontWeight: 400 }}>
          {run.id.slice(0, 8)}
        </span>
      </h1>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-4)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <StatusDot status={run.status} />
          <span style={{ font: '13px/1 var(--font-sans)', color: STATUS_COLOR[run.status] ?? 'var(--fg-2)' }}>
            {STATUS_LABEL[run.status] ?? run.status}
          </span>
        </div>
        {run.inputTokens && (
          <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            {run.inputTokens}↑ / {run.outputTokens}↓ token
          </span>
        )}
        <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          {new Date(run.createdAt).toLocaleString('id-ID')}
        </span>
      </div>

      {/* Prompt */}
      <div style={{ marginBottom: 'var(--s-5)' }}>
        <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 'var(--s-2)' }}>
          Prompt
        </div>
        <div
          style={{
            padding: 'var(--s-3)',
            background: 'var(--bg-2)',
            borderRadius: 'var(--r-sm)',
            font: '14px/1.6 var(--font-sans)',
            color: 'var(--fg-1)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {(run.input as Record<string, unknown>)?.prompt as string ?? ''}
        </div>
      </div>

      {/* Tool calls timeline */}
      {toolCalls.length > 0 && (
        <div style={{ marginBottom: 'var(--s-5)' }}>
          <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 'var(--s-2)' }}>
            Eksekusi tool ({toolCalls.length})
          </div>
          {toolCalls.map((tc) => <ToolCallCard key={tc.id} tc={tc} />)}
        </div>
      )}

      {/* Approval UI */}
      {run.status === 'awaiting_approval' && (
        <div
          style={{
            padding: 'var(--s-4)',
            border: '1px solid var(--amber)',
            borderRadius: 'var(--r-md)',
            background: 'var(--amber-light, #FFF8E7)',
            marginBottom: 'var(--s-5)',
          }}
        >
          <p style={{ font: '14px/1.6 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-3)' }}>
            Agen memerlukan persetujuan untuk melanjutkan tool call ini.
          </p>
          {actionError && (
            <p style={{ font: '13px/1 var(--font-sans)', color: '#C13D3D', marginBottom: 'var(--s-3)' }}>{actionError}</p>
          )}
          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <button
              onClick={handleApprove}
              disabled={approving || rejecting}
              style={{
                padding: '8px 16px',
                background: 'var(--teal)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                font: '14px/1 var(--font-sans)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {approving ? 'Menyetujui…' : 'Setujui & lanjutkan'}
            </button>
            <button
              onClick={handleReject}
              disabled={approving || rejecting}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#C13D3D',
                border: '1px solid #C13D3D',
                borderRadius: 'var(--r-sm)',
                font: '14px/1 var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              {rejecting ? 'Menolak…' : 'Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Output */}
      {outputText && (
        <div style={{ marginBottom: 'var(--s-5)' }}>
          <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 'var(--s-2)' }}>
            Jawaban agen
          </div>
          <div
            style={{
              padding: 'var(--s-4)',
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              font: '14px/1.7 var(--font-sans)',
              color: 'var(--fg-1)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {outputText}
          </div>
        </div>
      )}

      {/* Error */}
      {run.status === 'failed' && run.error && (
        <div
          style={{
            padding: 'var(--s-3)',
            background: 'var(--red-light, #FEF2F2)',
            border: '1px solid #C13D3D',
            borderRadius: 'var(--r-sm)',
            font: '13px/1.5 var(--font-sans)',
            color: '#C13D3D',
          }}
        >
          {run.error}
        </div>
      )}
    </div>
  )
}
