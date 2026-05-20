'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function TaxesSeedButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function seed() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/fin/taxes/seed', { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal memuat pajak standar.')
      setBusy(false)
      return
    }
    router.refresh()
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button onClick={seed} disabled={busy}
        style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? 'Memuat…' : 'Muat Pajak Standar'}
      </button>
      {error && <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--red, #c33)' }}>{error}</span>}
    </div>
  )
}
