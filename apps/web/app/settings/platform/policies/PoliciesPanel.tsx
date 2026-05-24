'use client'

import { useState } from 'react'
import type { Policy, CustomRole } from '@kantorcore/db'

export function PoliciesPanel({
  initial,
  roles,
}: {
  initial: Policy[]
  roles: CustomRole[]
}) {
  const [items, setItems] = useState(initial)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    resource: '',
    action: '',
    effect: 'allow' as 'allow' | 'deny',
    principalType: 'any' as 'any' | 'membership_role' | 'custom_role' | 'user',
    principalId: '',
    priority: '100',
  })

  async function refresh() {
    const res = await fetch('/api/policies')
    if (res.ok) {
      const data = await res.json()
      setItems(data.policies)
    }
  }

  async function create() {
    setBusy(true)
    const res = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        resource: form.resource,
        action: form.action,
        effect: form.effect,
        principalType: form.principalType,
        principalId: form.principalType === 'any' ? null : form.principalId,
        priority: parseInt(form.priority) || 100,
      }),
    })
    if (res.ok) {
      setShowNew(false)
      setForm({ name: '', resource: '', action: '', effect: 'allow', principalType: 'any', principalId: '', priority: '100' })
      await refresh()
    } else {
      const err = await res.json().catch(() => ({ error: 'Gagal.' }))
      alert(err.error)
    }
    setBusy(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus policy ini?')) return
    const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' })
    if (res.ok) await refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Policies ({items.length})
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
          {showNew ? 'Tutup' : '+ Policy Baru'}
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
          <Field label="Nama">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              placeholder="Finance manager dapat posting tagihan"
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Resource">
              <input
                value={form.resource}
                onChange={(e) => setForm({ ...form, resource: e.target.value })}
                style={inputStyle}
                placeholder="records:contact atau fin.invoice"
              />
            </Field>
            <Field label="Action">
              <input
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                style={inputStyle}
                placeholder="create / update / delete / *"
              />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Effect">
              <select value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value as 'allow' | 'deny' })} style={inputStyle}>
                <option value="allow">Allow</option>
                <option value="deny">Deny</option>
              </select>
            </Field>
            <Field label="Principal type">
              <select
                value={form.principalType}
                onChange={(e) => setForm({ ...form, principalType: e.target.value as typeof form.principalType })}
                style={inputStyle}
              >
                <option value="any">Any</option>
                <option value="membership_role">Membership role</option>
                <option value="custom_role">Custom role</option>
                <option value="user">User</option>
              </select>
            </Field>
            <Field label="Priority">
              <input
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                style={inputStyle}
                placeholder="100"
              />
            </Field>
          </div>
          {form.principalType !== 'any' && (
            <Field label="Principal ID">
              {form.principalType === 'membership_role' ? (
                <select
                  value={form.principalId}
                  onChange={(e) => setForm({ ...form, principalId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— pilih —</option>
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                </select>
              ) : form.principalType === 'custom_role' ? (
                <select
                  value={form.principalId}
                  onChange={(e) => setForm({ ...form, principalId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— pilih —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.key}>{r.name} ({r.key})</option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.principalId}
                  onChange={(e) => setForm({ ...form, principalId: e.target.value })}
                  style={inputStyle}
                  placeholder="user UUID"
                />
              )}
            </Field>
          )}
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
          Belum ada policy. Tanpa policy, default-allow berlaku untuk admin/owner; member ditolak kecuali ada allow eksplisit.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--s-3)',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${p.effect === 'allow' ? 'var(--teal)' : '#c0392b'}`,
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {p.name}
                </span>
                <span style={{ font: '11px/1.4 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
                  {p.effect.toUpperCase()} {p.principalType}
                  {p.principalId ? `:${p.principalId}` : ''} → {p.resource} / {p.action}
                  {' · prio '}{p.priority}
                </span>
              </div>
              <button
                onClick={() => remove(p.id)}
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
