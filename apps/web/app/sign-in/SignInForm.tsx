'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@kantorcore/ui'
import { AuthShell, Field, ErrorBanner } from '../../components/AuthLayout'
import { useTurnstile } from '../../hooks/useTurnstile'

export default function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // TOTP second step
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials')
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')

  const { containerRef: turnstileRef, token: turnstileToken, reset: resetTurnstile } = useTurnstile()

  async function onCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, cfTurnstileToken: turnstileToken }),
    })
    if (res.ok) {
      window.location.href = '/'
      return
    }
    if (res.status === 202) {
      const data = await res.json()
      setChallengeToken(data.challengeToken)
      setStep('totp')
      setPending(false)
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal masuk.' }))
    setError(data.error ?? 'Gagal masuk.')
    resetTurnstile()
    setPending(false)
  }

  async function onTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/totp/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken, code: totpCode }),
    })
    if (res.ok) {
      window.location.href = '/'
      return
    }
    const data = await res.json().catch(() => ({ error: 'Kode salah.' }))
    setError(data.error ?? 'Kode salah.')
    setPending(false)
  }

  if (step === 'totp') {
    return (
      <AuthShell
        title="Verifikasi 2FA"
        subtitle="Masukkan kode dari aplikasi autentikasi Anda."
        footerHref="/sign-in"
        footerText="Kembali ke halaman masuk"
      >
        <form onSubmit={onTotpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <Field
            label="Kode 6 digit"
            type="text"
            value={totpCode}
            onChange={setTotpCode}
            autoComplete="one-time-code"
            required
          />
          <Button variant="primary" size="md" fullWidth disabled={pending}>
            {pending ? 'Memverifikasi…' : 'Verifikasi'}
          </Button>
          <p style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center', margin: 0 }}>
            Tidak punya akses ke aplikasi autentikasi?{' '}
            <span style={{ color: 'var(--fg-2)' }}>Masukkan kode cadangan sebagai gantinya.</span>
          </p>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Masuk"
      subtitle="Akses workspace KantorCore Anda."
      footerHref="/sign-up"
      footerText="Belum punya akun? Daftar"
    >
      <form onSubmit={onCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Field label="Kata sandi" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            href="/reset"
            style={{ font: '13px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
          >
            Lupa kata sandi?
          </Link>
        </div>
        <Button variant="primary" size="md" fullWidth disabled={pending}>
          {pending ? 'Memproses…' : 'Masuk'}
        </Button>
        <div ref={turnstileRef} />
      </form>
    </AuthShell>
  )
}
