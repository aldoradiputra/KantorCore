'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function SeedToolsButton({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function seed() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    setError(null)
    const res = await fetch('/api/agent/tools/seed', { method: 'POST' })
    const data = (await res.json().catch(() => ({}))) as { inserted?: number; error?: string }
    if (res.ok) {
      setMsg(
        data.inserted && data.inserted > 0
          ? `${data.inserted} tool ditambahkan.`
          : 'Tool default sudah lengkap.',
      )
      startTransition(() => router.refresh())
    } else {
      setError(data.error ?? 'Gagal seed tool.')
    }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
      <button
        type="button"
        onClick={seed}
        disabled={disabled || busy || pending}
        style={{
          height: 28,
          padding: '0 var(--s-3)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: disabled ? 'var(--fg-3)' : 'var(--fg-2)',
          borderRadius: 'var(--r-sm)',
          font: '600 11px/1 var(--font-sans)',
          cursor: disabled ? 'not-allowed' : busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? 'Memuat…' : 'Seed tool default'}
      </button>
      {msg && (
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--teal)' }}>{msg}</span>
      )}
      {error && (
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--red)' }}>{error}</span>
      )}
    </div>
  )
}
