'use client'

import { useState } from 'react'
import type { Approval } from '@kantorcore/db'

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--amber)',
  approved: 'var(--teal)',
  rejected: '#c0392b',
  cancelled: 'var(--fg-3)',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
}

export function ApprovalsInbox({ initial }: { initial: Approval[] }) {
  const [items, setItems] = useState(initial)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  async function refresh(next: 'pending' | 'all') {
    setFilter(next)
    const url = next === 'pending' ? '/api/approvals?status=pending' : '/api/approvals'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setItems(data.approvals)
    }
  }

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusyId(id)
    const res = await fetch(`/api/approvals/${id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes: notes[id] || undefined }),
    })
    if (res.ok) {
      await refresh(filter)
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal.' }))
      alert(err.error ?? 'Gagal.')
    }
    setBusyId(null)
  }

  const shown = filter === 'pending' ? items.filter((a) => a.status === 'pending') : items

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['pending', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => refresh(f)}
            style={{
              height: 30,
              padding: '0 14px',
              border: '1px solid var(--border)',
              background: filter === f ? 'var(--indigo)' : 'var(--surface)',
              color: filter === f ? 'var(--white)' : 'var(--fg-2)',
              borderRadius: 'var(--r-sm)',
              font: '600 12px/1 var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            {f === 'pending' ? 'Menunggu' : 'Semua'}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--r-md)',
            font: '13px/1.5 var(--font-sans)',
            color: 'var(--fg-3)',
          }}
        >
          Tidak ada permintaan persetujuan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map((a) => {
            const sc = STATUS_COLOR[a.status] ?? 'var(--fg-3)'
            const isPending = a.status === 'pending'
            return (
              <div
                key={a.id}
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                    {a.title}
                  </span>
                  <span
                    style={{
                      font: '600 10px/1 var(--font-sans)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '3px 7px',
                      borderRadius: 999,
                      color: sc,
                      border: `1px solid ${sc}`,
                    }}
                  >
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>

                {a.description && (
                  <p style={{ font: '13px/1.55 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
                    {a.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 'var(--s-4)', flexWrap: 'wrap', font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
                  <span>
                    Resource: <code style={{ font: '12px/1 var(--font-mono, monospace)' }}>{a.resourceType}</code>
                  </span>
                  <span>Action: <code style={{ font: '12px/1 var(--font-mono, monospace)' }}>{a.action}</code></span>
                  {a.requiredRole && <span>Peran: <b>{a.requiredRole}</b></span>}
                </div>

                {a.decisionNotes && (
                  <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)', fontStyle: 'italic' }}>
                    Catatan: {a.decisionNotes}
                  </div>
                )}

                {isPending && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                    <textarea
                      value={notes[a.id] ?? ''}
                      onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                      placeholder="Catatan keputusan (opsional)"
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
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => decide(a.id, 'approved')}
                        disabled={busyId === a.id}
                        style={{
                          height: 32,
                          padding: '0 14px',
                          background: 'var(--teal)',
                          color: 'var(--white)',
                          border: 'none',
                          borderRadius: 'var(--r-sm)',
                          font: '600 12px/1 var(--font-sans)',
                          cursor: busyId === a.id ? 'wait' : 'pointer',
                        }}
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => decide(a.id, 'rejected')}
                        disabled={busyId === a.id}
                        style={{
                          height: 32,
                          padding: '0 14px',
                          background: 'transparent',
                          color: '#c0392b',
                          border: '1px solid rgba(192,57,43,0.3)',
                          borderRadius: 'var(--r-sm)',
                          font: '600 12px/1 var(--font-sans)',
                          cursor: busyId === a.id ? 'wait' : 'pointer',
                        }}
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
