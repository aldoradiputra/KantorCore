'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HdTeam } from '../../../lib/helpdesk'

export default function TeamsClient({ teams: initial, isAdmin }: { teams: HdTeam[]; isAdmin: boolean }) {
  const router = useRouter()
  const [teams, setTeams] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/hd/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      const team = await res.json()
      setTeams((prev) => [...prev, team])
      setName(''); setDescription(''); setShowForm(false)
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {teams.length === 0 && !showForm && (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Belum ada tim. {isAdmin && 'Buat tim pertama.'}
        </div>
      )}

      {teams.map((t) => (
        <div key={t.id} style={{
          padding: 'var(--s-4)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
        }}>
          <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: t.description ? 6 : 0 }}>
            {t.name}
          </div>
          {t.description && (
            <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>{t.description}</div>
          )}
        </div>
      ))}

      {isAdmin && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            height: 36, padding: '0 var(--s-4)', background: 'transparent',
            color: 'var(--indigo)', border: '1px dashed var(--indigo)',
            borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          + Tambah Tim
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', padding: 'var(--s-4)', background: 'var(--bg)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Nama Tim</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} placeholder="Tier-1 Support" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Deskripsi (opsional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
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
