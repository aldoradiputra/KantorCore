'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewModelForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ key: '', label: '', labelPlural: '' })
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/platform/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: form.key,
        label: form.label,
        labelPlural: form.labelPlural || form.label,
      }),
    })
    if (res.ok) {
      setForm({ key: '', label: '', labelPlural: '' })
      setOpen(false)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal.' }))
      setError(err.error ?? 'Gagal.')
    }
    setBusy(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          alignSelf: 'flex-start',
          height: 32,
          padding: '0 14px',
          background: 'var(--indigo)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: 'var(--r-sm)',
          font: '600 12px/1 var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        + Entitas Baru
      </button>
    )
  }

  return (
    <div
      style={{
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
        Entitas Tenant Baru
      </div>
      <p style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
        Entitas tenant disimpan di tabel platform.records (EAV). Tambahkan custom field
        setelah dibuat untuk menambah atribut.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <Field label="Key">
          <input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="vendor_rating"
            style={inputStyle}
          />
        </Field>
        <Field label="Label">
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Vendor Rating"
            style={inputStyle}
          />
        </Field>
      </div>
      <Field label="Label Plural">
        <input
          value={form.labelPlural}
          onChange={(e) => setForm({ ...form, labelPlural: e.target.value })}
          placeholder="Vendor Ratings (default = sama dengan label)"
          style={inputStyle}
        />
      </Field>
      {error && (
        <div style={{ font: '12px/1.4 var(--font-sans)', color: '#c0392b' }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={submit}
          disabled={busy}
          style={{
            height: 32,
            padding: '0 16px',
            background: 'var(--indigo)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            font: '600 12px/1 var(--font-sans)',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Menyimpan…' : 'Buat'}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{
            height: 32,
            padding: '0 14px',
            background: 'var(--surface)',
            color: 'var(--fg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            font: '600 12px/1 var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Batal
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg)',
  boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}
