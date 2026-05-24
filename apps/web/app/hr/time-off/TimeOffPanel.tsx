'use client'

import { useState, useEffect } from 'react'

type LeaveRow = {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  halfDay: boolean
  status: string
  notes: string | null
  approvedBy: string | null
}

const LEAVE_LABELS: Record<string, string> = {
  annual_leave: 'Cuti Tahunan',
  sick_leave: 'Sakit',
  maternity: 'Melahirkan',
  paternity: 'Kelahiran Anak',
  unpaid: 'Tanpa Bayar',
  other: 'Lainnya',
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(179,90,0,0.08)',  color: 'var(--amber)', label: 'Menunggu' },
  approved: { bg: 'rgba(15,123,108,0.08)', color: 'var(--teal)',  label: 'Disetujui' },
  rejected: { bg: 'rgba(192,57,43,0.08)', color: '#c0392b',      label: 'Ditolak'   },
}

const GROUP_COLOR: Record<string, string> = {
  annual_leave: 'var(--indigo)',
  sick_leave:   '#c0392b',
  maternity:    'var(--teal)',
  paternity:    'var(--teal)',
  unpaid:       'var(--amber)',
  other:        'var(--fg-3)',
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00'))
}

function daySpan(start: string, end: string, half: boolean): string {
  const a = new Date(start + 'T00:00:00')
  const b = new Date(end   + 'T00:00:00')
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1
  if (half) return '½ hari'
  return days === 1 ? '1 hari' : `${days} hari`
}

type GroupedRows = Record<string, LeaveRow[]>

export function TimeOffPanel({ employees }: { employees: { id: string; name: string }[] }) {
  const [rows, setRows]         = useState<LeaveRow[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [groupBy, setGroupBy]   = useState<'leaveType' | 'status'>('leaveType')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [form, setForm] = useState({
    employeeId: '',
    leaveType: 'annual_leave',
    startDate: '',
    endDate: '',
    halfDay: false,
    notes: '',
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/hr/time-off?limit=100')
    if (res.ok) {
      const d = await res.json()
      setRows(d.rows ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      alert('Karyawan, tanggal mulai, dan tanggal selesai wajib diisi.')
      return
    }
    setBusy(true)
    const res = await fetch('/api/hr/time-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowNew(false)
      setForm({ employeeId: '', leaveType: 'annual_leave', startDate: '', endDate: '', halfDay: false, notes: '' })
      await load()
    } else {
      const e = await res.json().catch(() => ({ error: 'Gagal.' }))
      alert(e.error)
    }
    setBusy(false)
  }

  const filtered = filterStatus === 'all' ? rows : rows.filter(r => r.status === filterStatus)

  const grouped: GroupedRows = {}
  for (const r of filtered) {
    const key = groupBy === 'leaveType' ? r.leaveType : r.status
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px var(--content-gutter)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
          {total} permintaan
        </span>
        <span style={{ flex: 1 }} />

        {/* Filter by status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Semua status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>

        {/* Group by */}
        <select
          value={groupBy}
          onChange={e => setGroupBy(e.target.value as typeof groupBy)}
          style={selectStyle}
        >
          <option value="leaveType">Kelompokkan: Jenis Cuti</option>
          <option value="status">Kelompokkan: Status</option>
        </select>

        <button
          onClick={() => setShowNew(v => !v)}
          style={{
            height: 30, padding: '0 12px',
            background: showNew ? 'var(--surface)' : 'var(--indigo)',
            color: showNew ? 'var(--fg-2)' : 'var(--white)',
            border: showNew ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--r-sm)',
            font: '600 12px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          {showNew ? 'Tutup' : '+ Ajukan Cuti'}
        </button>
      </div>

      {/* New leave form */}
      {showNew && (
        <div style={{
          padding: '14px var(--content-gutter)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)', flexShrink: 0,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        }}>
          <Field label="Karyawan">
            <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} style={inputStyle}>
              <option value="">— pilih —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Jenis Cuti">
            <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })} style={inputStyle}>
              {Object.entries(LEAVE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="½ Hari?">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, font: '13px var(--font-sans)', color: 'var(--fg-1)' }}>
              <input type="checkbox" checked={form.halfDay} onChange={e => setForm({ ...form, halfDay: e.target.checked })} />
              Setengah hari
            </label>
          </Field>
          <Field label="Mulai">
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Selesai">
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Catatan">
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} placeholder="Opsional" />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              onClick={create}
              disabled={busy}
              style={{
                height: 30, padding: '0 16px',
                background: 'var(--indigo)', color: 'var(--white)',
                border: 'none', borderRadius: 'var(--r-sm)',
                font: '600 12px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-4) var(--content-gutter)' }}>
        {loading ? (
          <div style={{ color: 'var(--fg-3)', font: '13px var(--font-sans)', padding: '24px 0' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            border: '1px dashed var(--border)', borderRadius: 'var(--r-md)',
          }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Tidak ada data cuti.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
            {Object.entries(grouped).map(([key, items]) => {
              const color = groupBy === 'leaveType' ? (GROUP_COLOR[key] ?? 'var(--fg-3)') : (STATUS_STYLE[key]?.color ?? 'var(--fg-3)')
              const label = groupBy === 'leaveType' ? (LEAVE_LABELS[key] ?? key) : (STATUS_STYLE[key]?.label ?? key)
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ font: '700 11px/1 var(--font-sans)', color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {label}
                    </span>
                    <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>({items.length})</span>
                  </div>
                  <div style={{
                    border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                    overflow: 'hidden', background: 'var(--surface)',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
                      <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                          {['Karyawan', groupBy === 'leaveType' ? 'Status' : 'Jenis Cuti', 'Mulai', 'Selesai', 'Durasi', 'Catatan'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(r => {
                          const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending
                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '9px 12px', font: '500 12px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                                {r.employeeName}
                              </td>
                              <td style={{ padding: '9px 12px' }}>
                                {groupBy === 'leaveType' ? (
                                  <span style={{
                                    font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase',
                                    letterSpacing: '0.04em', padding: '2px 6px', borderRadius: 3,
                                    background: ss.bg, color: ss.color,
                                  }}>
                                    {ss.label}
                                  </span>
                                ) : (
                                  <span style={{ font: '12px var(--font-sans)', color: 'var(--fg-2)' }}>
                                    {LEAVE_LABELS[r.leaveType] ?? r.leaveType}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '9px 12px', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{formatDate(r.startDate)}</td>
                              <td style={{ padding: '9px 12px', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{formatDate(r.endDate)}</td>
                              <td style={{ padding: '9px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{daySpan(r.startDate, r.endDate, r.halfDay)}</td>
                              <td style={{ padding: '9px 12px', color: 'var(--fg-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.notes ?? '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  height: 30, padding: '0 8px',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '12px var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg)', cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg)', boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}
