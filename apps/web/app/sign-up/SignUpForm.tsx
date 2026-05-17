'use client'

import { useState } from 'react'
import { Button } from '@kantr/ui'
import { AuthShell, Field, ErrorBanner } from '../../components/AuthLayout'

export default function SignUpForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    if (res.ok) {
      window.location.href = '/'
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal mendaftar.' }))
    setError(data.error ?? 'Gagal mendaftar.')
    setPending(false)
  }

  return (
    <AuthShell
      title="Daftar"
      subtitle="Buat akun Kantr untuk mulai. Workspace akan dibuat setelah Anda masuk."
      footerHref="/sign-in"
      footerText="Sudah punya akun? Masuk"
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field label="Nama lengkap" type="text" value={name} onChange={setName} autoComplete="name" required />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Field
          label="Kata sandi"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          hint="Minimal 10 karakter."
        />
        <Button variant="primary" size="md" fullWidth disabled={pending}>
          {pending ? 'Memproses…' : 'Daftar'}
        </Button>
      </form>
    </AuthShell>
  )
}
