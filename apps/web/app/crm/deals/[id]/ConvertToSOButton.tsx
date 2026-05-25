'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ConvertToSOButton({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function convert() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sales/from-deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dealId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal membuat sales order.')
        return
      }
      router.push(`/sales/orders/${data.so.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: 'var(--s-4)',
      background: 'linear-gradient(135deg, var(--indigo-light), var(--surface))',
      border: '1px solid var(--indigo)',
      borderRadius: 'var(--r-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--s-4)',
    }}>
      <div>
        <div style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 4 }}>
          Deal Menang! 🎉
        </div>
        <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
          Konversi ke sales order untuk mulai proses penagihan dan pemenuhan.
        </div>
        {error && (
          <div style={{ marginTop: 6, font: '12px/1 var(--font-sans)', color: '#DC2626' }}>{error}</div>
        )}
      </div>
      <button
        onClick={convert}
        disabled={loading}
        style={{
          padding: '10px 18px',
          borderRadius: 'var(--r-md)',
          background: 'var(--indigo)',
          color: 'white',
          font: '600 13px/1 var(--font-sans)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {loading ? 'Membuat…' : 'Buat Sales Order →'}
      </button>
    </div>
  )
}
