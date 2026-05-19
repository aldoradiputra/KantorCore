'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SeedButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function seed() {
    setBusy(true)
    const res = await fetch('/api/fin/accounts/seed', { method: 'POST' })
    setBusy(false)
    if (res.ok) router.refresh()
  }

  return (
    <button onClick={seed} disabled={busy}
      style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', border: 'none', font: '600 13px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Menyiapkan…' : 'Muat Akun Standar'}
    </button>
  )
}
