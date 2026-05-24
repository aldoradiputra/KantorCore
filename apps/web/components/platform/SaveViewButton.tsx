'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SaveViewButton({
  modelKey,
  currentColumns,
}: {
  modelKey: string
  currentColumns: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    const res = await fetch(`/api/platform/models/${encodeURIComponent(modelKey)}/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        columns: currentColumns,
        filters: [],
        sorts: [{ field: 'created_at', dir: 'desc' }],
        isDefault,
      }),
    })
    if (res.ok) {
      setName('')
      setIsDefault(false)
      setOpen(false)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal.' }))
      alert(err.error)
    }
    setBusy(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '5px 10px',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--r-sm)',
          font: '12px/1 var(--font-sans)',
          color: 'var(--fg-3)',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        + Simpan View
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama view"
        style={{
          height: 26,
          padding: '0 8px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          font: '12px/1 var(--font-sans)',
          color: 'var(--fg-1)',
          background: 'var(--bg)',
        }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Default
      </label>
      <button
        onClick={save}
        disabled={busy || !name.trim()}
        style={{
          padding: '5px 10px',
          background: 'var(--indigo)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: 'var(--r-sm)',
          font: '600 12px/1 var(--font-sans)',
          cursor: busy || !name.trim() ? 'wait' : 'pointer',
        }}
      >
        {busy ? '…' : 'Simpan'}
      </button>
      <button
        onClick={() => setOpen(false)}
        style={{
          padding: '5px 10px',
          background: 'transparent',
          color: 'var(--fg-3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          font: '12px/1 var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        Batal
      </button>
    </div>
  )
}

export function DeleteViewButton({ viewId }: { viewId: string }) {
  const router = useRouter()
  async function del() {
    if (!confirm('Hapus view ini?')) return
    const res = await fetch(`/api/platform/views/${viewId}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }
  return (
    <button
      onClick={del}
      title="Hapus view"
      style={{
        marginLeft: 4,
        padding: '0 4px',
        background: 'transparent',
        color: 'var(--fg-3)',
        border: 'none',
        cursor: 'pointer',
        font: '11px/1 var(--font-sans)',
      }}
    >
      ×
    </button>
  )
}
