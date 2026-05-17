'use client'

import { useState } from 'react'
import { Button } from '@kantr/ui'
import { AuthShell, Field, ErrorBanner } from '../../components/AuthLayout'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export default function SignUpForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function onWorkspaceNameChange(v: string) {
    setWorkspaceName(v)
    if (!slugTouched) setWorkspaceSlug(slugify(v))
  }

  function onSlugChange(v: string) {
    setSlugTouched(true)
    setWorkspaceSlug(slugify(v))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, workspaceName, workspaceSlug }),
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
      subtitle="Buat akun Kantr dan workspace untuk perusahaan Anda."
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

        <div
          style={{
            paddingTop: 'var(--s-3)',
            marginTop: 'var(--s-2)',
            borderTop: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-4)',
          }}
        >
          <Field
            label="Nama workspace"
            type="text"
            value={workspaceName}
            onChange={onWorkspaceNameChange}
            required
            hint="Contoh: PT Maju Jaya. Akan menjadi nama tampilan workspace."
          />
          <Field
            label="Slug workspace"
            type="text"
            value={workspaceSlug}
            onChange={onSlugChange}
            required
            hint={workspaceSlug ? `${workspaceSlug}.kantr.com` : 'Akan menjadi subdomain Anda.'}
          />
        </div>

        <Button variant="primary" size="md" fullWidth disabled={pending}>
          {pending ? 'Memproses…' : 'Daftar & buat workspace'}
        </Button>
      </form>
    </AuthShell>
  )
}
