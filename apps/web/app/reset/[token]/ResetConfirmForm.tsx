'use client'

import { useState } from 'react'
import { Button } from '@kantorcore/ui'
import { AuthShell, Field, ErrorBanner } from '../../../components/AuthLayout'

export function ResetConfirmForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Kata sandi tidak cocok.')
      return
    }
    setPending(true)
    const res = await fetch('/api/auth/reset-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Terjadi kesalahan.')
      setPending(false)
      return
    }
    setDone(true)
    setPending(false)
  }

  if (done) {
    return (
      <AuthShell title="Kata sandi diperbarui" subtitle="" footerHref="/sign-in" footerText="Masuk sekarang">
        <p style={{ font: '14px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
          Kata sandi Anda berhasil diubah. Semua sesi aktif lainnya telah dihentikan.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Buat kata sandi baru"
      subtitle="Minimal 10 karakter."
      footerHref="/sign-in"
      footerText="Kembali ke halaman masuk"
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field
          label="Kata sandi baru"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
        <Field
          label="Konfirmasi kata sandi"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
        />
        <Button variant="primary" size="md" fullWidth disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan kata sandi baru'}
        </Button>
      </form>
    </AuthShell>
  )
}
