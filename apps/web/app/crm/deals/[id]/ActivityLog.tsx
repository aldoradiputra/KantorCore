'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ActivityType } from '../../../../lib/crm'

const TYPE_LABEL: Record<ActivityType, string> = {
  note:    'Catatan',
  call:    'Telepon',
  email:   'Email',
  meeting: 'Rapat',
}

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg-1)',
  width: '100%',
  boxSizing: 'border-box',
}

interface ActivityRow {
  id: string
  type: ActivityType
  title: string
  notes: string | null
  doneAt: string | Date
  createdByName: string | null
}

export function ActivityLog({ dealId, activities }: { dealId: string; activities: ActivityRow[] }) {
  const router = useRouter()
  const [type, setType] = useState<ActivityType>('note')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Judul wajib diisi.')
    setSubmitting(true)
    const res = await fetch(`/api/crm/deals/${dealId}/activity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, title, notes: notes || null }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal menyimpan aktivitas.')
      setSubmitting(false)
      return
    }
    setTitle('')
    setNotes('')
    router.refresh()
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aktivitas</span>

      {/* Add activity form */}
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
          <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
            {(Object.keys(TYPE_LABEL) as ActivityType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
          <input style={inputStyle} placeholder="Judul aktivitas…" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <textarea
          style={{ ...inputStyle, height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'vertical' }}
          rows={2}
          placeholder="Catatan (opsional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--red, #c33)' }}>{error}</div>}
        <div>
          <button type="submit" disabled={submitting}
            style={{ padding: '6px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 12px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Menyimpan…' : 'Tambah Aktivitas'}
          </button>
        </div>
      </form>

      {/* Activity list */}
      {activities.length === 0 ? (
        <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', padding: '12px 0' }}>Belum ada aktivitas.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {activities.map((a) => (
            <div key={a.id} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: a.notes ? 4 : 0 }}>
                <span style={{ font: '500 10px/1 var(--font-sans)', padding: '2px 7px', borderRadius: 999, background: 'var(--bg)', color: 'var(--fg-3)', border: '1px solid var(--border)' }}>
                  {TYPE_LABEL[a.type]}
                </span>
                <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)', flex: 1 }}>{a.title}</span>
                <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', flexShrink: 0 }}>
                  {new Date(a.doneAt).toLocaleDateString('id-ID')}
                  {a.createdByName && ` · ${a.createdByName}`}
                </span>
              </div>
              {a.notes && (
                <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)', marginTop: 4 }}>{a.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
