'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Employee } from '@kantorcore/db'

interface ProjectOption { id: string; slug: string; name: string }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
      {children}
      {hint && <span style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</span>}
    </div>
  )
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

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

export function NewEntryForm({
  employees,
  projects,
}: {
  employees: Employee[]
  projects: ProjectOption[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [hours, setHours] = useState('1')
  const [minutes, setMinutes] = useState('0')
  const [description, setDescription] = useState('')
  const [billable, setBillable] = useState(true)
  const [projectId, setProjectId] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const durationMinutes = Math.round((parseFloat(hours) || 0) * 60 + (parseFloat(minutes) || 0))
    if (durationMinutes <= 0) {
      setError('Durasi harus lebih dari 0 menit.')
      setPending(false)
      return
    }

    const res = await fetch('/api/time/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId,
        date,
        durationMinutes,
        description: description || null,
        billable,
        projectId: projectId || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/time/entries/${data.entry.id}`)
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal menyimpan.' }))
    setError(data.error ?? 'Gagal menyimpan.')
    setPending(false)
  }

  return (
    <div style={{ padding: 'var(--s-5)', maxWidth: 600 }}>
      <div style={{ marginBottom: 'var(--s-5)' }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Log Waktu
        </h1>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <Field label="Karyawan *">
          <select style={selectStyle} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Tanggal *">
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Jam" hint="0–23">
            <input
              type="number"
              min={0}
              max={23}
              style={inputStyle}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </Field>
          <Field label="Menit" hint="0–59">
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              style={inputStyle}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Deskripsi">
          <textarea
            style={{ ...inputStyle, height: 72, padding: '8px 10px', resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pekerjaan yang dilakukan..."
          />
        </Field>

        <Field label="Proyek (opsional)">
          <select style={selectStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— Tanpa proyek —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Jenis">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            Billable (dapat ditagih)
          </label>
        </Field>

        {error && (
          <div style={{ padding: '10px 12px', background: 'var(--danger-light, #fff5f5)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--danger, #c0392b)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              height: 36,
              padding: '0 20px',
              background: pending ? 'var(--fg-3)' : 'var(--indigo)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              font: '500 13px/1 var(--font-sans)',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Menyimpan…' : 'Simpan'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              height: 36,
              padding: '0 16px',
              background: 'transparent',
              color: 'var(--fg-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              font: '500 13px/1 var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
