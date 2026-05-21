'use client'

import { useState } from 'react'

export default function SignInForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/portal/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      // In dev mode (no email provider configured), API returns link directly
      if (data.devLink) setDevLink(data.devLink)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{
          padding: 'var(--s-4)',
          background: 'var(--teal-light)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--r-sm)',
          font: '13px/1.5 var(--font-sans)',
          color: 'var(--success)',
        }}>
          Jika email Anda terdaftar, kami sudah mengirimkan tautan masuk.
          Periksa kotak masuk Anda.
        </div>
        {devLink && (
          <div style={{
            padding: 'var(--s-3)',
            background: 'var(--bg)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--r-sm)',
            font: '11px/1.4 var(--font-mono)',
            color: 'var(--fg-3)',
            wordBreak: 'break-all',
          }}>
            <strong>Dev mode:</strong>{' '}
            <a href={devLink} style={{ color: 'var(--indigo)' }}>{devLink}</a>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@perusahaan.com"
          style={{
            height: 40, padding: '0 12px',
            border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            font: '14px/1 var(--font-sans)', color: 'var(--fg-1)',
            background: 'var(--surface)',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          height: 40, padding: '0 var(--s-4)', background: 'var(--indigo)',
          color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
          font: '600 14px/1 var(--font-sans)',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Mengirim…' : 'Kirim Tautan Masuk'}
      </button>
    </form>
  )
}
