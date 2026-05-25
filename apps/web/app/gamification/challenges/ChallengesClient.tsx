'use client'

import { useState } from 'react'

interface Challenge {
  id: string; title: string; description: string | null; metricType: string
  targetValue: string; targetDate: string | null; isActive: boolean
  badgeId: string | null; isRepeatable: boolean
}
interface Badge { id: string; name: string; icon: string; color: string }

const METRIC_LABEL: Record<string, string> = {
  revenue: 'Pendapatan', deals_closed: 'Deal Ditutup',
  tasks_completed: 'Tugas Selesai', training_hours: 'Jam Pelatihan', custom: 'Kustom',
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg-1)', width: '100%', boxSizing: 'border-box',
}

export function ChallengesClient({ initialChallenges, badges }: {
  initialChallenges: Challenge[]
  badges: Badge[]
}) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', metricType: 'custom', targetValue: '', targetDate: '', badgeId: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim() || !form.targetValue) return setError('Judul dan target wajib diisi.')
    setSaving(true)
    try {
      const res = await fetch('/api/gamification/challenges', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title:       form.title,
          metricType:  form.metricType,
          targetValue: Number(form.targetValue),
          targetDate:  form.targetDate || null,
          badgeId:     form.badgeId || null,
          description: form.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan.'); return }
      setChallenges((prev) => [{ ...data.challenge, targetValue: String(data.challenge.targetValue) }, ...prev])
      setShowNew(false)
      setForm({ title: '', metricType: 'custom', targetValue: '', targetDate: '', badgeId: '', description: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-5)' }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Tantangan & KPI</h1>
          <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>Tetapkan target performa dan lacak progres tim</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} style={{
          padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)',
          color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer',
        }}>
          + Tantangan Baru
        </button>
      </div>

      {showNew && (
        <form onSubmit={submit} style={{
          padding: 'var(--s-4)', border: '1px solid var(--indigo)', borderRadius: 'var(--r-md)',
          background: 'var(--surface)', marginBottom: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)',
        }}>
          <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Tantangan Baru</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Judul *</span>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul tantangan" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Jenis Metrik</span>
              <select style={inputStyle} value={form.metricType} onChange={(e) => setForm({ ...form, metricType: e.target.value })}>
                {Object.entries(METRIC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Target *</span>
              <input style={inputStyle} type="number" min={1} value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} placeholder="Nilai target" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Tenggat</span>
              <input style={inputStyle} type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </label>
            {badges.length > 0 && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Lencana (opsional)</span>
                <select style={inputStyle} value={form.badgeId} onChange={(e) => setForm({ ...form, badgeId: e.target.value })}>
                  <option value="">— Tidak ada —</option>
                  {badges.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
                </select>
              </label>
            )}
          </div>
          {error && <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--danger, #c33)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer' }}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'transparent', border: '1px solid var(--border)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        {challenges.length === 0 && (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', color: 'var(--fg-3)', font: '13px/1.6 var(--font-sans)' }}>
            Belum ada tantangan. Buat tantangan pertama untuk mulai melacak KPI tim.
          </div>
        )}
        {challenges.map((c) => {
          const badge = badges.find((b) => b.id === c.badgeId)
          return (
            <div key={c.id} style={{
              padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 'var(--s-4)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 4 }}>
                  {c.title}
                </div>
                <div style={{ display: 'flex', gap: 12, font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                  <span>{METRIC_LABEL[c.metricType] ?? c.metricType}</span>
                  <span>Target: <strong style={{ color: 'var(--fg-2)' }}>{Number(c.targetValue).toLocaleString('id-ID')}</strong></span>
                  {c.targetDate && <span>Tenggat: {new Date(c.targetDate).toLocaleDateString('id-ID')}</span>}
                </div>
              </div>
              {badge && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${badge.color}`, background: badge.color + '22' }}>
                  <span style={{ fontSize: 16 }}>{badge.icon}</span>
                  <span style={{ font: '500 11px/1 var(--font-sans)', color: badge.color }}>{badge.name}</span>
                </div>
              )}
              {!c.isActive && (
                <span style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 999 }}>Nonaktif</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
