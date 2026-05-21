'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SOActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(action: 'confirm' | 'invoice' | 'cancel') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sales/orders/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `Gagal menjalankan aksi.`)
      } else {
        if (action === 'invoice') {
          const j = await res.json()
          router.push(`/fin/invoices/${j.invoiceId}`)
        } else {
          router.refresh()
        }
      }
    } catch {
      setError('Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  const btnStyle = (color: string, outline = false): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 'var(--r-md)',
    background: outline ? 'transparent' : color,
    color: outline ? color : 'white',
    font: '600 13px/1 var(--font-sans)',
    border: outline ? `1px solid ${color}` : 'none',
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.6 : 1,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {status === 'quotation' && (
          <button disabled={busy} style={btnStyle('var(--indigo)')} onClick={() => call('confirm')}>
            Konfirmasi Penawaran
          </button>
        )}
        {(status === 'confirmed') && (
          <button disabled={busy} style={btnStyle('var(--teal, #0F7B6C)')} onClick={() => call('invoice')}>
            Buat Faktur
          </button>
        )}
        {(status === 'quotation' || status === 'confirmed') && (
          <button disabled={busy} style={btnStyle('var(--danger, #c33)', true)} onClick={() => call('cancel')}>
            Batalkan
          </button>
        )}
      </div>
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}
    </div>
  )
}
