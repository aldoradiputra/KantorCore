'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RecordActions({ modelKey, id }: { modelKey: string; id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    if (!confirm('Hapus record ini? Tindakan ini tidak dapat dibatalkan.')) return
    setBusy(true)
    const res = await fetch(`/api/records/${encodeURIComponent(modelKey)}/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push(`/r/${encodeURIComponent(modelKey)}`)
      router.refresh()
    } else {
      setBusy(false)
      alert('Gagal menghapus.')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => router.push(`/r/${encodeURIComponent(modelKey)}/${id}/edit`)}
        style={{ height: 32, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: 'pointer' }}
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        disabled={busy}
        style={{ height: 32, padding: '0 12px', border: '1px solid rgba(179,90,0,0.3)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 12px/1 var(--font-sans)', color: 'var(--amber)', cursor: busy ? 'wait' : 'pointer' }}
      >
        Hapus
      </button>
    </div>
  )
}
