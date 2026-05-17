'use client'

import { useState } from 'react'
import { Button } from '@kantr/ui'
import { AuthShell, Field, ErrorBanner } from '../../components/AuthLayout'

export default function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      window.location.href = '/'
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal masuk.' }))
    setError(data.error ?? 'Gagal masuk.')
    setPending(false)
  }

  return (
    <AuthShell title="Masuk" subtitle="Akses workspace Kantr Anda." footerHref="/sign-up" footerText="Belum punya akun? Daftar">
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Field label="Kata sandi" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        <Button variant="primary" size="md" fullWidth disabled={pending}>
          {pending ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>
    </AuthShell>
  )
}
