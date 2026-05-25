'use client'

import { useState } from 'react'

export default function SignaturePanel({ soId, token }: { soId: string; token: string }) {
  const [name, setName] = useState('')
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sign() {
    if (!name.trim()) { setError('Nama wajib diisi.'); return }
    setSigning(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/orders/${soId}/sign`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menandatangani.'); return }
      setDone(true)
    } finally {
      setSigning(false)
    }
  }

  if (done) {
    return (
      <div style={{ padding: 'var(--s-4)', background: '#D1FAE5', borderRadius: 'var(--r-md)', textAlign: 'center', color: '#065F46', font: '14px/1.4 var(--font-sans)' }}>
        ✓ Terima kasih, penawaran sudah dikonfirmasi.
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--s-4)', background: 'var(--bg)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Tanda Tangan Elektronik</div>
      <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
        Dengan menandatangani, Anda menyetujui isi penawaran ini sebagai dokumen sah yang mengikat.
      </div>
      <input
        type="text"
        placeholder="Nama lengkap"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '14px/1 var(--font-sans)', background: 'var(--surface)', color: 'var(--fg-1)', outline: 'none' }}
      />
      {error && <div style={{ font: '12px/1 var(--font-sans)', color: '#DC2626' }}>{error}</div>}
      <button
        onClick={sign}
        disabled={signing}
        style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: signing ? 'not-allowed' : 'pointer', opacity: signing ? 0.6 : 1 }}
      >
        {signing ? 'Menandatangani…' : 'Tandatangani & Konfirmasi'}
      </button>
    </div>
  )
}
