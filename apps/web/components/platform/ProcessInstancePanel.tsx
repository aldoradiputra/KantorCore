'use client'

import { useState } from 'react'
import type { ProcessInstance, ProcessRunStep } from '@kantorcore/db'

interface InstanceWithSteps {
  instance: ProcessInstance
  steps: ProcessRunStep[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan',
  paused: 'Jeda',
  completed: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--fg-3)',
  running: 'var(--indigo)',
  paused: 'var(--amber)',
  completed: 'var(--teal)',
  failed: '#c0392b',
  cancelled: 'var(--fg-3)',
}

const STEP_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan',
  completed: 'Selesai',
  skipped: 'Dilewati',
  failed: 'Gagal',
}

export function StartProcessButton({ processSlug }: { processSlug: string }) {
  const [busy, setBusy] = useState(false)
  const [instanceId, setInstanceId] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    const res = await fetch('/api/flow/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processSlug }),
    })
    if (res.ok) {
      const data = await res.json()
      setInstanceId(data.instance.id)
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal memulai proses.' }))
      alert(err.error ?? 'Gagal memulai proses.')
    }
    setBusy(false)
  }

  if (instanceId) {
    return (
      <a
        href={`/proses/instances/${instanceId}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 34,
          padding: '0 16px',
          background: 'var(--teal)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: 'var(--r-sm)',
          font: '600 13px/1 var(--font-sans)',
          textDecoration: 'none',
        }}
      >
        Lihat Instance →
      </a>
    )
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      style={{
        height: 34,
        padding: '0 16px',
        background: 'var(--indigo)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--r-sm)',
        font: '600 13px/1 var(--font-sans)',
        cursor: busy ? 'wait' : 'pointer',
      }}
    >
      {busy ? 'Memulai…' : '▶ Jalankan Proses'}
    </button>
  )
}

export function InstanceDetail({ data: initial }: { data: InstanceWithSteps }) {
  const [data, setData] = useState(initial)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const { instance, steps } = data

  async function refresh() {
    const res = await fetch(`/api/flow/instances/${instance.id}`)
    if (res.ok) setData(await res.json())
  }

  async function advance(stepRunId: string) {
    setAdvancing(stepRunId)
    const res = await fetch(`/api/flow/instances/${instance.id}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepRunId, notes: notes || undefined }),
    })
    if (res.ok) {
      setNotes('')
      await refresh()
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal.' }))
      alert(err.error ?? 'Gagal.')
    }
    setAdvancing(null)
  }

  async function cancel() {
    if (!confirm('Batalkan instance ini?')) return
    const res = await fetch(`/api/flow/instances/${instance.id}`, { method: 'DELETE' })
    if (res.ok) await refresh()
  }

  const statusColor = STATUS_COLOR[instance.status] ?? 'var(--fg-3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${statusColor}`,
          borderRadius: 'var(--r-md)',
          background: 'var(--surface)',
          gap: 'var(--s-3)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: '600 13px/1 var(--font-sans)', color: statusColor }}>
            {STATUS_LABEL[instance.status] ?? instance.status}
          </span>
          <span style={{ font: '11px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
            {instance.id}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refresh}
            style={{
              height: 30,
              padding: '0 12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              borderRadius: 'var(--r-sm)',
              font: '12px/1 var(--font-sans)',
              color: 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            Perbarui
          </button>
          {instance.status !== 'completed' && instance.status !== 'cancelled' && (
            <button
              onClick={cancel}
              style={{
                height: 30,
                padding: '0 12px',
                border: '1px solid rgba(179,90,0,0.3)',
                background: 'transparent',
                borderRadius: 'var(--r-sm)',
                font: '12px/1 var(--font-sans)',
                color: 'var(--amber)',
                cursor: 'pointer',
              }}
            >
              Batalkan
            </button>
          )}
        </div>
      </div>

      {instance.error && (
        <div
          style={{
            padding: '10px 14px',
            border: '1px solid rgba(192,57,43,0.3)',
            borderRadius: 'var(--r-md)',
            background: 'rgba(192,57,43,0.05)',
            font: '13px/1.5 var(--font-sans)',
            color: '#c0392b',
          }}
        >
          {instance.error}
        </div>
      )}

      {/* Step runs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((sr) => {
          const sc = STATUS_COLOR[sr.status] ?? 'var(--fg-3)'
          const isPendingHuman = sr.status === 'running' && instance.status === 'paused'
          return (
            <div
              key={sr.id}
              style={{
                padding: '14px 16px',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${sc}`,
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--bg)',
                      border: `2px solid ${sc}`,
                      color: sc,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      font: '600 10px/1 var(--font-sans)',
                      flexShrink: 0,
                    }}
                  >
                    {sr.sequence}
                  </span>
                  <span style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                    Langkah {sr.sequence}
                  </span>
                </div>
                <span
                  style={{
                    font: '600 10px/1 var(--font-sans)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '3px 7px',
                    borderRadius: 999,
                    color: sc,
                    border: `1px solid ${sc}`,
                    background: 'var(--bg)',
                  }}
                >
                  {STEP_STATUS_LABEL[sr.status] ?? sr.status}
                </span>
              </div>

              {sr.outcomeRecordType && (
                <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
                  Menghasilkan:{' '}
                  <code style={{ font: '12px/1 var(--font-mono, monospace)' }}>
                    {sr.outcomeRecordType}
                  </code>
                  {sr.outcomeRecordId && (
                    <> · <code style={{ font: '12px/1 var(--font-mono, monospace)' }}>{sr.outcomeRecordId}</code></>
                  )}
                </div>
              )}

              {sr.error && (
                <div style={{ font: '12px/1.4 var(--font-sans)', color: '#c0392b' }}>
                  {sr.error}
                </div>
              )}

              {/* Advance control for human steps */}
              {isPendingHuman && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan (opsional)"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      font: '13px/1.5 var(--font-sans)',
                      color: 'var(--fg-1)',
                      background: 'var(--bg)',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => advance(sr.id)}
                    disabled={advancing === sr.id}
                    style={{
                      alignSelf: 'flex-start',
                      height: 32,
                      padding: '0 14px',
                      background: 'var(--indigo)',
                      color: 'var(--white)',
                      border: 'none',
                      borderRadius: 'var(--r-sm)',
                      font: '600 12px/1 var(--font-sans)',
                      cursor: advancing === sr.id ? 'wait' : 'pointer',
                    }}
                  >
                    {advancing === sr.id ? 'Memproses…' : 'Tandai Selesai →'}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {steps.length === 0 && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              font: '13px/1 var(--font-sans)',
              color: 'var(--fg-3)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--r-md)',
            }}
          >
            Belum ada langkah yang dijalankan.
          </div>
        )}
      </div>
    </div>
  )
}
