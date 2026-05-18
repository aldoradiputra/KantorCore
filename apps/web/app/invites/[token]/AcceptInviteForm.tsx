'use client'

import { useState } from 'react'

export default function AcceptInviteForm({
  token,
  mode,
  userEmail,
}: {
  token: string
  mode: 'accept-only'
  userEmail: string
}) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onAccept() {
    setStatus('pending')
    const res = await fetch(`/api/invites/${token}`, { method: 'POST' })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => { window.location.href = '/' }, 1500)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Gagal menerima undangan.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <p style={{ font: '500 13px/1.5 var(--font-sans)', color: 'var(--teal)', textAlign: 'center' }}>
        Berhasil bergabung! Mengarahkan…
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      {error && (
        <div role="alert" style={{ padding: '10px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)' }}>
          {error}
        </div>
      )}
      <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
        Masuk sebagai <strong style={{ color: 'var(--fg-1)' }}>{userEmail}</strong>
      </p>
      <button
        type="button"
        onClick={onAccept}
        disabled={status === 'pending'}
        style={{ height: 38, background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: status === 'pending' ? 'wait' : 'pointer' }}
      >
        {status === 'pending' ? 'Memproses…' : 'Terima undangan'}
      </button>
    </div>
  )
}
