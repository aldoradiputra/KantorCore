'use client'

import { useState } from 'react'
import type { CustomRole } from '@kantorcore/db'

export function RolesPanel({ initial }: { initial: CustomRole[] }) {
  const [items, setItems] = useState(initial)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ key: '', name: '', description: '' })

  async function refresh() {
    const res = await fetch('/api/custom-roles')
    if (res.ok) {
      const data = await res.json()
      setItems(data.roles)
    }
  }

  async function create() {
    setBusy(true)
    const res = await fetch('/api/custom-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ key: '', name: '', description: '' })
      setShowNew(false)
      await refresh()
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal.' }))
      alert(err.error)
    }
    setBusy(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus role ini?')) return
    const res = await fetch(`/api/custom-roles/${id}`, { method: 'DELETE' })
    if (res.ok) await refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Custom Roles ({items.length})
        </h2>
        <button
          onClick={() => setShowNew(!showNew)}
          style={{
            height: 32,
            padding: '0 14px',
            background: showNew ? 'var(--surface)' : 'var(--indigo)',
            color: showNew ? 'var(--fg-2)' : 'var(--white)',
            border: showNew ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--r-sm)',
            font: '600 12px/1 var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          {showNew ? 'Tutup' : '+ Role Baru'}
        </button>
      </div>

      {showNew && (
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <Field label="Key">
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                style={inputStyle}
                placeholder="finance_manager"
              />
            </Field>
            <Field label="Nama">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                placeholder="Finance Manager"
              />
            </Field>
          </div>
          <Field label="Deskripsi">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={inputStyle}
              placeholder="(opsional)"
            />
          </Field>
          <button
            onClick={create}
            disabled={busy}
            style={{
              alignSelf: 'flex-start',
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
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--r-md)',
            font: '13px/1.5 var(--font-sans)',
            color: 'var(--fg-3)',
          }}
        >
          Belum ada custom role. Tambahkan role spesifik domain (mis. <code>finance_manager</code>, <code>warehouse</code>).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--s-3)',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {r.name}{' '}
                  <code style={{ font: '11px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
                    {r.key}
                  </code>
                </span>
                {r.description && (
                  <span style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {r.description}
                  </span>
                )}
              </div>
              {!r.isSystem && (
                <button
                  onClick={() => remove(r.id)}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: 'transparent',
                    color: 'var(--amber)',
                    border: '1px solid rgba(179,90,0,0.3)',
                    borderRadius: 'var(--r-sm)',
                    font: '12px/1 var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
