'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  return { start, end }
}

export function NewPayRunForm() {
  const router = useRouter()
  const now = new Date()
  const init = monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1)
  const [periodStart, setPeriodStart] = useState(init.start)
  const [periodEnd, setPeriodEnd] = useState(init.end)
  const [description, setDescription] = useState('')
  const [populate, setPopulate] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!periodStart || !periodEnd) return setError('Periode wajib diisi.')
    if (periodEnd < periodStart) return setError('Akhir periode harus setelah awal periode.')

    setSubmitting(true)
    const res = await fetch('/api/pay/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ periodStart, periodEnd, description: description || null, populateActiveEmployees: populate }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat pay run.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/pay/runs/${j.id}`)
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Periode Mulai">
          <input style={inputStyle} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </Field>
        <Field label="Periode Selesai">
          <input style={inputStyle} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </Field>
      </div>

      <Field label="Catatan (opsional)">
        <textarea style={{ ...inputStyle, height: 72, padding: '8px 10px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '13px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
        <input type="checkbox" checked={populate} onChange={(e) => setPopulate(e.target.checked)} />
        Isi otomatis dari karyawan aktif (membuat payslip kosong per karyawan)
      </label>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}

      <div>
        <button type="submit" disabled={submitting}
          style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
          {submitting ? 'Membuat…' : 'Buat Pay Run (Draf)'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{label}</span>
      {children}
    </label>
  )
}
