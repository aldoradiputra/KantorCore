'use client'

import { useState, useEffect, useMemo } from 'react'
import { RecordToolbar } from '../../../components/RecordToolbar'
import type { ViewFilter, ViewSort, FieldDef, SavedView } from '../../../components/RecordToolbar'

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

const LEAVE_OPTIONS = Object.keys(LEAVE_LABELS)
const STATUS_OPTIONS = Object.keys(STATUS_STYLE)

const FIELDS: FieldDef[] = [
  { key: 'employeeName', label: 'Karyawan', type: 'text' },
  { key: 'leaveType',    label: 'Jenis Cuti', type: 'select', options: LEAVE_OPTIONS },
  { key: 'status',       label: 'Status',     type: 'select', options: STATUS_OPTIONS },
  { key: 'startDate',    label: 'Mulai',      type: 'date' },
  { key: 'endDate',      label: 'Selesai',    type: 'date' },
]

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

function applyFilter(row: LeaveRow, f: ViewFilter): boolean {
  const rawVal = row[f.field as keyof LeaveRow]
  const val = rawVal == null ? '' : String(rawVal)
  const fv = String(f.value ?? '')
  switch (f.op) {
    case 'eq':       return val === fv
    case 'ne':       return val !== fv
    case 'contains': return val.toLowerCase().includes(fv.toLowerCase())
    case 'gt':       return val > fv
    case 'gte':      return val >= fv
    case 'lt':       return val < fv
    case 'lte':      return val <= fv
    case 'in':       return Array.isArray(f.value) ? (f.value as string[]).includes(val) : val === fv
    case 'not_in':   return Array.isArray(f.value) ? !(f.value as string[]).includes(val) : val !== fv
    default:         return true
  }
}

export function TimeOffPanel({ employees }: { employees: { id: string; name: string }[] }) {
  const [rows, setRows]         = useState<LeaveRow[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [busy, setBusy]         = useState(false)

  // Toolbar state
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState<ViewFilter[]>([])
  const [sorts, setSorts]       = useState<ViewSort[]>([])
  const [groupBy, setGroupBy]   = useState<string | null>('leaveType')
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)

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

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = rows

    // Text search across employeeName
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.employeeName.toLowerCase().includes(q) ||
        (LEAVE_LABELS[r.leaveType] ?? r.leaveType).toLowerCase().includes(q)
      )
    }

    // Apply ViewFilter array
    for (const f of filters) {
      result = result.filter(r => applyFilter(r, f))
    }

    // Apply sorts
    if (sorts.length > 0) {
      result = [...result].sort((a, b) => {
        for (const s of sorts) {
          const av = String(a[s.field as keyof LeaveRow] ?? '')
          const bv = String(b[s.field as keyof LeaveRow] ?? '')
          const cmp = av.localeCompare(bv)
          if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
        }
        return 0
      })
    }

    return result
  }, [rows, search, filters, sorts])

  const grouped: GroupedRows = {}
  if (groupBy) {
    for (const r of filtered) {
      const key = String(r[groupBy as keyof LeaveRow] ?? 'other')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r)
    }
  } else {
    grouped['all'] = filtered
  }

  function handleViewSelect(id: string | null) {
    setActiveViewId(id)
    if (!id) {
      setFilters([])
      setSorts([])
      setGroupBy('leaveType')
      return
    }
    const view = savedViews.find(v => v.id === id)
    if (view) {
      setFilters(view.filters)
      setSorts(view.sorts)
      // groupBy not stored in SavedView — keep current
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* RecordToolbar */}
      <div style={{ position: 'relative' }}>
        <RecordToolbar
          modelKey="hr.time_off_request"
          fields={FIELDS}
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          sorts={sorts}
          onSortsChange={setSorts}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          savedViews={savedViews}
          activeViewId={activeViewId}
          onViewSelect={handleViewSelect}
          onViewSaved={view => setSavedViews(prev => [...prev, view])}
          onViewDeleted={id => setSavedViews(prev => prev.filter(v => v.id !== id))}
          totalCount={total}
          visibleCount={filtered.length !== total ? filtered.length : undefined}
        />
        {/* New request button sits inside toolbar row — appended via absolute or just next to it */}
        <div style={{
          position: 'absolute', top: 6, right: 'var(--content-gutter)',
        }}>
          <button
            onClick={() => setShowNew(v => !v)}
            style={{
              height: 28, padding: '0 12px',
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
              const isGrouped = groupBy !== null && key !== 'all'
              const color = !isGrouped ? 'var(--fg-2)'
                : groupBy === 'leaveType' ? (GROUP_COLOR[key] ?? 'var(--fg-3)')
                : (STATUS_STYLE[key]?.color ?? 'var(--fg-3)')
              const label = !isGrouped ? ''
                : groupBy === 'leaveType' ? (LEAVE_LABELS[key] ?? key)
                : (STATUS_STYLE[key]?.label ?? key)

              return (
                <div key={key}>
                  {isGrouped && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ font: '700 11px/1 var(--font-sans)', color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {label}
                      </span>
                      <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>({items.length})</span>
                    </div>
                  )}
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
