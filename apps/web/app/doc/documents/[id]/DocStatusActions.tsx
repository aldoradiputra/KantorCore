'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocStatus } from '../../../../lib/documents'

const TRANSITIONS: Record<DocStatus, { to: DocStatus; label: string; color: string }[]> = {
  draft:      [{ to: 'active',     label: 'Aktifkan',      color: 'var(--teal)' }],
  active:     [{ to: 'terminated', label: 'Hentikan',      color: 'var(--danger, #c33)' }],
  expired:    [{ to: 'terminated', label: 'Hentikan',      color: 'var(--danger, #c33)' }],
  terminated: [],
}

export function DocStatusActions({ id, status }: { id: string; status: DocStatus }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actions = TRANSITIONS[status] ?? []
  if (actions.length === 0) return null

  async function moveTo(newStatus: DocStatus) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/doc/documents/${id}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Gagal mengubah status.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {actions.map((a) => (
          <button
            key={a.to}
            disabled={busy}
            onClick={() => moveTo(a.to)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--r-md)',
              border: `1px solid ${a.color}`,
              background: 'transparent',
              color: a.color,
              font: '600 13px/1 var(--font-sans)',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}
    </div>
  )
}
