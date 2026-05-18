'use client'

import { useState } from 'react'

export default function WorkspaceForm({
  tenantId,
  tenantName: initialName,
  tenantSlug,
  createdAt,
  canEdit,
}: {
  tenantId: string
  tenantName: string
  tenantSlug: string
  createdAt: string
  canEdit: boolean
}) {
  const [name, setName] = useState(initialName)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving'); setError('')
    const res = await fetch('/api/settings/workspace', {
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
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <h2 style={{ marginBottom: 'var(--s-6)' }}>Pengaturan Umum</h2>

        <div style={{ padding: 'var(--s-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s-5)' }}>
          <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 'var(--s-4)' }}>Ruang Kerja</div>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Field label="Nama ruang kerja">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                required
                style={{ ...inputStyle, background: canEdit ? 'var(--bg)' : 'var(--surface)', color: canEdit ? 'var(--fg-1)' : 'var(--fg-3)' }}
              />
            </Field>
            <Field label="Slug">
              <input value={tenantSlug} readOnly style={{ ...inputStyle, background: 'var(--surface)', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
              <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Slug tidak bisa diubah — dipakai sebagai ID workspace di API.</span>
            </Field>
            <Field label="Dibuat">
              <span style={{ font: '400 13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                {new Date(createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </Field>
            {canEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                <button
                  type="submit"
                  disabled={status === 'saving'}
                  style={{ height: 34, padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: status === 'saving' ? 'wait' : 'pointer' }}
                >
                  {status === 'saving' ? 'Menyimpan…' : 'Simpan'}
                </button>
                {status === 'saved' && <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--teal)' }}>Tersimpan ✓</span>}
              </div>
            )}
          </form>
        </div>

        {!canEdit && (
          <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            Hanya admin dan owner yang bisa mengubah pengaturan workspace.
          </p>
        )}
      </div>
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

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', font: '400 14px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none',
}
