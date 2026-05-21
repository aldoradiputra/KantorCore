'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function POActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(action: 'confirm' | 'receive' | 'bill' | 'cancel') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/proc/orders/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `Gagal menjalankan aksi ${action}.`)
      } else {
        if (action === 'bill') {
          const j = await res.json()
          router.push(`/fin/bills/${j.billId}`)
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

  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 'var(--r-md)',
    background: color,
    color: 'white',
    font: '600 13px/1 var(--font-sans)',
    border: 'none',
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.6 : 1,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {status === 'draft' && (
          <button disabled={busy} style={btnStyle('var(--indigo)')} onClick={() => call('confirm')}>
            Konfirmasi PO
          </button>
        )}
        {status === 'confirmed' && (
          <button disabled={busy} style={btnStyle('var(--teal, #0F7B6C)')} onClick={() => call('receive')}>
            Terima Barang
          </button>
        )}
        {(status === 'confirmed' || status === 'received') && (
          <button disabled={busy} style={btnStyle('var(--amber, #B35A00)')} onClick={() => call('bill')}>
            Buat Tagihan
          </button>
        )}
        {(status === 'draft' || status === 'confirmed') && (
          <button disabled={busy} style={{ ...btnStyle('transparent'), color: 'var(--danger, #c33)', border: '1px solid var(--danger, #c33)' }} onClick={() => call('cancel')}>
            Batalkan PO
          </button>
        )}
      </div>
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}
    </div>
  )
}
