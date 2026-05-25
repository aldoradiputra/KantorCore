'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Application {
  id: string; appNumber: string; candidateName: string; candidateEmail: string
  status: string; jobTitle: string | null; createdAt: string
}

const STATUSES = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'] as const
const STATUS_LABEL: Record<string, string> = {
  new: 'Baru', screening: 'Seleksi', interview: 'Wawancara',
  assessment: 'Tes', offer: 'Penawaran', hired: 'Diterima', rejected: 'Ditolak',
}
const STATUS_COLOR: Record<string, string> = {
  new: '#6B7280', screening: 'var(--indigo)', interview: 'var(--teal)',
  assessment: 'var(--amber)', offer: '#7C3AED', hired: 'var(--teal)', rejected: 'var(--danger)',
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeStatus) params.set('status', activeStatus)
    if (search.trim()) params.set('q', search.trim())
    fetch(`/api/recruitment/applications?${params}`)
      .then((r) => r.json())
      .then((j) => setApps(j.applications ?? []))
      .finally(() => setLoading(false))
  }, [activeStatus, search])

  const chipStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
    font: '500 11px/1 var(--font-sans)',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color + '22' : 'transparent',
    color: active ? color : 'var(--fg-3)',
  })

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 900 }}>
      <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-4)' }}>
        Pipeline Lamaran
      </h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--s-3)' }}>
        <button style={chipStyle(!activeStatus, 'var(--indigo)')} onClick={() => setActiveStatus(null)}>
          Semua
        </button>
        {STATUSES.map((s) => (
          <button key={s} style={chipStyle(activeStatus === s, STATUS_COLOR[s]!)} onClick={() => setActiveStatus(activeStatus === s ? null : s)}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <input
        type="search" placeholder="Cari nama atau email…"
        value={search} onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', maxWidth: 360, height: 34, padding: '0 10px',
          border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
          font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
          background: 'var(--bg-1)', marginBottom: 'var(--s-4)', boxSizing: 'border-box',
        }}
      />

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--fg-3)', font: '13px/1 var(--font-sans)', padding: 'var(--s-4)' }}>Memuat…</div>
      ) : apps.length === 0 ? (
        <div style={{ color: 'var(--fg-3)', font: '13px/1.6 var(--font-sans)', padding: 'var(--s-6)', textAlign: 'center' }}>
          Belum ada lamaran.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['ID', 'Nama', 'Posisi', 'Status', 'Tanggal'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-3)' }}>
                    <Link href={`/recruitment/applications/${app.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none' }}>
                      {app.appNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--fg-1)', fontWeight: 500 }}>
                    <div>{app.candidateName}</div>
                    <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{app.candidateEmail}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--fg-2)' }}>{app.jobTitle ?? '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 999,
                      font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase',
                      color: STATUS_COLOR[app.status] ?? 'var(--fg-3)',
                      border: `1px solid ${STATUS_COLOR[app.status] ?? 'var(--border)'}`,
                    }}>
                      {STATUS_LABEL[app.status] ?? app.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--fg-3)', fontSize: 12 }}>
                    {new Date(app.createdAt).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
