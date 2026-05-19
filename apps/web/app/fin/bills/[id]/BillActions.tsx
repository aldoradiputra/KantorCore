'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function BillActions({
  billId,
  status,
  journalEntryId,
}: {
  billId: string
  status: string
  journalEntryId: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(action: 'confirm' | 'pay' | 'cancel') {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/fin/bills/${billId}/${action}`, { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Aksi gagal.')
      setBusy(false)
      return
    }
    router.refresh()
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        {status === 'draft' && (
          <>
            <button onClick={() => call('confirm')} disabled={busy}
              style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', border: 'none', font: '600 13px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}>
              Konfirmasi & Posting Jurnal
            </button>
            <button onClick={() => call('cancel')} disabled={busy}
              style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border-strong)', font: '600 13px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}>
              Batalkan
            </button>
          </>
        )}
        {status === 'confirmed' && (
          <button onClick={() => call('pay')} disabled={busy}
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--teal)', color: 'white', border: 'none', font: '600 13px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}>
            Tandai Sudah Dibayar
          </button>
        )}
        {journalEntryId && (
          <Link href={`/fin/journal/${journalEntryId}`}
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--indigo)', border: '1px solid var(--indigo)', font: '600 13px/1 var(--font-sans)', textDecoration: 'none' }}>
            Lihat Jurnal →
          </Link>
        )}
      </div>
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}
    </div>
  )
}
