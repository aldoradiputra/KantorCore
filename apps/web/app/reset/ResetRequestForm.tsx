'use client'

import { useState } from 'react'
import { Button } from '@kantorcore/ui'
import { AuthShell, Field, ErrorBanner } from '../../components/AuthLayout'

export function ResetRequestForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Terjadi kesalahan.')
      setPending(false)
      return
    }
    setDone(true)
    if (data.resetToken) setDevToken(data.resetToken)
    setPending(false)
  }

  if (done) {
    return (
      <AuthShell title="Cek email Anda" subtitle="" footerHref="/sign-in" footerText="Kembali ke halaman masuk">
        <p style={{ font: '14px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
          Jika email terdaftar, instruksi reset kata sandi telah dikirim. Cek inbox Anda.
        </p>
        {devToken && (
          <div
            style={{
              marginTop: 'var(--s-4)',
              padding: 'var(--s-3)',
              background: 'var(--bg-2)',
              borderRadius: 'var(--r-sm)',
              font: '12px/1.4 var(--font-mono)',
              color: 'var(--fg-2)',
              wordBreak: 'break-all',
            }}
          >
            <strong>Dev mode — link reset:</strong>
            <br />
            <a href={`/reset/${devToken}`} style={{ color: 'var(--indigo)' }}>
              /reset/{devToken}
            </a>
          </div>
        )}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset kata sandi"
      subtitle="Masukkan email Anda. Jika terdaftar, kami akan mengirimkan instruksi reset."
      footerHref="/sign-in"
      footerText="Kembali ke halaman masuk"
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Button variant="primary" size="md" fullWidth disabled={pending}>
          {pending ? 'Memproses…' : 'Kirim instruksi reset'}
        </Button>
      </form>
    </AuthShell>
  )
}
