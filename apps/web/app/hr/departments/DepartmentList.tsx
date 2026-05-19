'use client'

import { useState } from 'react'
import type { Department } from '@kantorcore/db'

export function DepartmentList({ initialDepartments }: { initialDepartments: Department[] }) {
  const [departments, setDepartments] = useState(initialDepartments)
  const [newName, setNewName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setError(null)
    setPending(true)
    const res = await fetch('/api/hr/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Gagal membuat departemen.')
      setPending(false)
      return
    }
    setDepartments((prev) => [...prev, data.department].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setPending(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-6)' }}>
          Departemen
        </h1>

        {/* Create form */}
        <form onSubmit={onCreate} style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
          <input
            type="text"
            placeholder="Nama departemen baru…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              flex: 1,
              height: 34,
              padding: '0 10px',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              font: '13px/1 var(--font-sans)',
              color: 'var(--fg-1)',
              background: 'var(--bg-1)',
            }}
          />
          <button
            type="submit"
            disabled={pending || !newName.trim()}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--indigo)',
              color: '#fff',
              font: '500 13px/1 var(--font-sans)',
              border: 'none',
              cursor: pending || !newName.trim() ? 'not-allowed' : 'pointer',
              opacity: pending || !newName.trim() ? 0.6 : 1,
            }}
          >
            {pending ? 'Menambah…' : 'Tambah'}
          </button>
        </form>

        {error && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: '#b91c1c', marginBottom: 'var(--s-3)' }}>
            {error}
          </div>
        )}

        {/* List */}
        {departments.length === 0 ? (
          <p style={{ font: '14px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            Belum ada departemen. Buat yang pertama di atas.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {departments.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border)',
                  font: '13px/1 var(--font-sans)',
                  color: 'var(--fg-1)',
                }}
              >
                {d.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
