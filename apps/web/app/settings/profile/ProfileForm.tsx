'use client'

import { useEffect, useState } from 'react'

export default function ProfileForm({
  userId,
  name: initialName,
  email,
}: {
  userId: string
  name: string
  email: string
}) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <h2 style={{ marginBottom: 'var(--s-6)' }}>Profil & Keamanan</h2>
        <NameForm userId={userId} initialName={initialName} email={email} />
        <AppearanceForm />
        <PasswordForm />
      </div>
    </div>
  )
}

function NameForm({ userId, initialName, email }: { userId: string; initialName: string; email: string }) {
  const [name, setName] = useState(initialName)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError('')
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Gagal menyimpan.')
      setStatus('error')
    }
  }

  return (
    <Card title="Profil">
      <Info label="Email" value={email} note="Email tidak bisa diubah." />
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', marginTop: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field label="Nama tampilan">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>
        <SaveButton status={status} />
      </form>
    </Card>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      setError('Konfirmasi kata sandi tidak cocok.')
      setStatus('error')
      return
    }
    setStatus('saving')
    setError('')
    const res = await fetch('/api/settings/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    if (res.ok) {
      setCurrent(''); setNext(''); setConfirm('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Gagal mengubah kata sandi.')
      setStatus('error')
    }
  }

  return (
    <Card title="Kata Sandi">
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field label="Kata sandi saat ini">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required style={inputStyle} />
        </Field>
        <Field label="Kata sandi baru">
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} style={inputStyle} />
        </Field>
        <Field label="Konfirmasi kata sandi baru">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={inputStyle} />
        </Field>
        <SaveButton status={status} label="Ubah kata sandi" />
      </form>
    </Card>
  )
}

type ThemeChoice = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeChoice; label: string; desc: string }[] = [
  { value: 'light',  label: 'Terang',  desc: 'Selalu tampilkan antarmuka terang' },
  { value: 'dark',   label: 'Gelap',   desc: 'Selalu tampilkan antarmuka gelap' },
  { value: 'system', label: 'Sistem',  desc: 'Ikuti pengaturan perangkat' },
]

function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (dark) document.documentElement.setAttribute('data-theme', 'dark')
  else document.documentElement.removeAttribute('data-theme')
}

function AppearanceForm() {
  const [theme, setTheme] = useState<ThemeChoice>('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kc-theme') as ThemeChoice | null
      if (stored && ['light', 'dark', 'system'].includes(stored)) setTheme(stored)
    } catch {}
  }, [])

  function handleTheme(choice: ThemeChoice) {
    setTheme(choice)
    try { localStorage.setItem('kc-theme', choice) } catch {}
    applyTheme(choice)
  }

  return (
    <Card title="Tampilan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Tema warna</span>
        <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTheme(opt.value)}
                style={{
                  flex: 1, padding: '12px 10px', borderRadius: 'var(--r-md)',
                  border: `2px solid ${active ? 'var(--indigo)' : 'var(--border)'}`,
                  background: active ? 'var(--indigo-light)' : 'var(--bg)',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>
                  {opt.value === 'light' ? '☀️' : opt.value === 'dark' ? '🌙' : '💻'}
                </div>
                <div style={{ font: `${active ? '600' : '500'} 12px/1 var(--font-sans)`, color: active ? 'var(--indigo)' : 'var(--fg-1)' }}>
                  {opt.label}
                </div>
                <div style={{ font: '11px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
                  {opt.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ── Shared primitives ─────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s-6)', padding: 'var(--s-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 'var(--s-4)' }}>{title}</div>
      {children}
    </div>
  )
}

function Info({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</span>
      <span style={{ font: '400 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</span>
      {note && <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{note}</span>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</span>
      {children}
    </label>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" style={{ padding: '10px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)' }}>
      {children}
    </div>
  )
}

function SaveButton({ status, label = 'Simpan' }: { status: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
      <button
        type="submit"
        disabled={status === 'saving'}
        style={{ height: 34, padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: status === 'saving' ? 'wait' : 'pointer' }}
      >
        {status === 'saving' ? 'Menyimpan…' : label}
      </button>
      {status === 'saved' && <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--teal)' }}>Tersimpan ✓</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', font: '400 14px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none',
}
