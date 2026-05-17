'use client'

import { useState } from 'react'
import { Button } from '@kantr/ui'

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

function keyify(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

function autoKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return keyify(words[0]).slice(0, 4)
  return keyify(words.map((w) => w[0]).join(''))
}

export default function NewProjectForm() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [key, setKey] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [keyTouched, setKeyTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function onNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
    if (!keyTouched) setKey(autoKey(v))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/proj/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, key, description }),
    })
    if (res.ok) {
      window.location.href = `/proj/${slug}`
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal membuat proyek.' }))
    setError(data.error ?? 'Gagal membuat proyek.')
    setPending(false)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--s-7) var(--s-5)',
        background: 'var(--bg)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          padding: 'var(--s-6)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 'var(--s-2)' }}>Proyek baru</h2>
        <p style={{ marginTop: 0, marginBottom: 'var(--s-5)', color: 'var(--fg-3)', font: '400 13px/1.5 var(--font-sans)' }}>
          Setiap proyek punya kode pendek untuk ID issue: <code>KAN-42</code>.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                background: 'rgba(179, 90, 0, 0.08)',
                border: '1px solid rgba(179, 90, 0, 0.2)',
                borderRadius: 'var(--r-sm)',
                font: '500 12px/1.4 var(--font-sans)',
                color: 'var(--amber)',
              }}
            >
              {error}
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Nama proyek</span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--s-3)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Slug</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                required
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Kode</span>
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  setKeyTouched(true)
                  setKey(keyify(e.target.value))
                }}
                required
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
              />
            </label>
          </div>
          <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: -4 }}>
            Issue ID: <code>{key || 'XXX'}-1</code>, <code>{key || 'XXX'}-2</code>, …
          </span>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Deskripsi (opsional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </label>

          <Button variant="primary" size="md" fullWidth disabled={pending}>
            {pending ? 'Memproses…' : 'Buat proyek'}
          </Button>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  background: 'var(--bg)',
  font: '400 14px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  outline: 'none',
}
