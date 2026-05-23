'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TimesheetEntryRow } from '../../../../lib/timesheet-shared'
import { formatDuration } from '../../../../lib/timesheet-shared'

export function EntryDetail({ entry }: { entry: TimesheetEntryRow }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    if (!confirm('Hapus entri ini?')) return
    setDeleting(true)
    await fetch(`/api/time/entries/${entry.id}`, { method: 'DELETE' })
    router.push('/time/entries')
    router.refresh()
  }

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 'var(--s-4)', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ width: 160, flexShrink: 0, font: '500 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ padding: 'var(--s-5)', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--s-5)', gap: 'var(--s-3)' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            {formatDuration(entry.durationMinutes)} — {entry.employeeName}
          </h1>
          <p style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
            {entry.date}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            height: 32,
            padding: '0 14px',
            background: 'transparent',
            color: 'var(--danger, #c0392b)',
            border: '1px solid var(--danger, #c0392b)',
            borderRadius: 'var(--r-sm)',
            font: '500 12px/1 var(--font-sans)',
            cursor: deleting ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          {deleting ? 'Menghapus…' : 'Hapus'}
        </button>
      </div>

      <div>
        {row('Karyawan', entry.employeeName)}
        {row('Tanggal', entry.date)}
        {row('Durasi', formatDuration(entry.durationMinutes))}
        {row('Jenis', entry.billable ? '✓ Billable' : 'Non-billable')}
        {entry.description && row('Deskripsi', entry.description)}
        {entry.projectId && row('Proyek ID', entry.projectId)}
        {entry.issueId && row('Issue ID', entry.issueId)}
        {row('Dibuat', new Date(entry.createdAt).toLocaleString('id-ID'))}
      </div>
    </div>
  )
}
