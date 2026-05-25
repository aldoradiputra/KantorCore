'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NEXT_STATUS: Record<string, string> = {
  new:        'screening',
  screening:  'interview',
  interview:  'assessment',
  assessment: 'offer',
  offer:      'hired',
}
const NEXT_LABEL: Record<string, string> = {
  new:        'Mulai Seleksi →',
  screening:  'Jadwalkan Wawancara →',
  interview:  'Kirim ke Tes →',
  assessment: 'Buat Penawaran →',
  offer:      'Terima Kandidat ✓',
}

export function ApplicationActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = NEXT_STATUS[currentStatus]

  async function advance(status: string) {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/recruitment/applications/${id}/stage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Terjadi kesalahan.')
      } else {
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const btn = (label: string, onClick: () => void, variant: 'primary' | 'danger'): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', cursor: busy ? 'wait' : 'pointer',
    font: '600 13px/1 var(--font-sans)', opacity: busy ? 0.6 : 1,
    background: variant === 'primary' ? 'var(--indigo)' : 'transparent',
    color: variant === 'primary' ? 'white' : 'var(--danger)',
    ...(variant === 'danger' ? { border: '1px solid var(--danger)' } : {}),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {next && (
          <button disabled={busy} style={btn(NEXT_LABEL[currentStatus]!, () => advance(next), 'primary')} onClick={() => advance(next)}>
            {NEXT_LABEL[currentStatus]}
          </button>
        )}
        <button disabled={busy} style={btn('Tolak', () => advance('rejected'), 'danger')} onClick={() => advance('rejected')}>
          Tolak Kandidat
        </button>
      </div>
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
