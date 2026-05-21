'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { KmsSpace, ArticleVisibility } from '../../lib/kms'

const VISIBILITY_LABEL: Record<ArticleVisibility, string> = {
  internal: 'Internal',
  portal:   'Portal',
  public:   'Publik',
}

const VISIBILITY_COLOR: Record<ArticleVisibility, string> = {
  internal: 'var(--fg-3)',
  portal:   'var(--indigo)',
  public:   'var(--success)',
}

export default function KmsSpacesClient({
  spaces: initial,
  counts,
  isAdmin,
}: {
  spaces: KmsSpace[]
  counts: Record<string, number>
  isAdmin: boolean
}) {
  const router = useRouter()
  const [spaces, setSpaces] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📚')
  const [visibility, setVisibility] = useState<ArticleVisibility>('internal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/kms/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, icon, visibility }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      const space = await res.json()
      setSpaces((prev) => [...prev, space])
      setName(''); setDescription(''); setIcon('📚'); setVisibility('internal'); setShowForm(false)
      router.refresh()
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {spaces.length === 0 && !showForm && (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Belum ada space. {isAdmin && 'Buat space pertama untuk mulai menulis.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s-4)' }}>
        {spaces.map((s) => (
          <Link
            key={s.id}
            href={`/kms/spaces/${s.slug}`}
            style={{
              padding: 'var(--s-4)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 120,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 28 }}>{s.icon || '📚'}</span>
              <span style={{
                font: '600 10px/1 var(--font-sans)',
                color: VISIBILITY_COLOR[s.visibility],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {VISIBILITY_LABEL[s.visibility]}
              </span>
            </div>
            <div>
              <div style={{ font: '600 15px/1.3 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 4 }}>
                {s.name}
              </div>
              {s.description && (
                <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
                  {s.description.length > 80 ? s.description.slice(0, 80) + '…' : s.description}
                </div>
              )}
            </div>
            <div style={{ marginTop: 'auto', font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
              {counts[s.id] ?? 0} artikel
            </div>
          </Link>
        ))}
      </div>

      {isAdmin && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            height: 36, padding: '0 var(--s-4)', background: 'transparent',
            color: 'var(--indigo)', border: '1px dashed var(--indigo)',
            borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          + Buat Space Baru
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} style={{ padding: 'var(--s-4)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', maxWidth: 480 }}>
          <h3 style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Space Baru</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 'var(--s-2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Ikon</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: 20 }} maxLength={4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Nama</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} placeholder="Help Center" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Deskripsi (opsional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Visibilitas</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as ArticleVisibility)} style={inputStyle}>
              <option value="internal">Internal — hanya anggota workspace</option>
              <option value="portal">Portal — pelanggan yang login</option>
              <option value="public">Publik — siapa saja</option>
            </select>
          </div>
          {error && <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            <button type="submit" disabled={saving} style={{ height: 32, padding: '0 var(--s-3)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ height: 32, padding: '0 var(--s-3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)',
}
