'use client'

import { useState } from 'react'
import type { WeeklySummaryRow } from '../../../lib/timesheet-shared'
import { formatDuration, weekStart, weekEnd } from '../../../lib/timesheet-shared'
import type { Employee } from '@kantorcore/db'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function WeeklySummary({
  initialRows,
  employees,
  initialWeekStart,
}: {
  initialRows: WeeklySummaryRow[]
  employees: Employee[]
  initialWeekStart: string
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart)
  const [empFilter, setEmpFilter] = useState('')
  const [rows, setRows] = useState(initialRows)
  const [loading, setLoading] = useState(false)

  async function fetchWeek(ws: string, empId: string) {
    setLoading(true)
    const we = weekEnd(ws)
    const params = new URLSearchParams({ dateFrom: ws, dateTo: we })
    if (empId) params.set('employeeId', empId)
    const res = await fetch(`/api/time/entries?${params}`)
    if (res.ok) {
      // We receive raw entries; aggregate client-side for the weekly view
      const data = await res.json()
      const entries: Array<{ employeeId: string; employeeName: string; date: string; projectId: string | null; durationMinutes: number; billable: boolean }> = data.entries
      const map = new Map<string, WeeklySummaryRow>()
      for (const e of entries) {
        const key = `${e.employeeId}|${e.date}|${e.projectId ?? ''}`
        const existing = map.get(key)
        if (existing) {
          existing.totalMinutes += e.durationMinutes
          if (e.billable) existing.billableMinutes += e.durationMinutes
        } else {
          map.set(key, {
            employeeId: e.employeeId,
            employeeName: e.employeeName,
            date: e.date,
            projectId: e.projectId,
            totalMinutes: e.durationMinutes,
            billableMinutes: e.billable ? e.durationMinutes : 0,
          })
        }
      }
      setRows([...map.values()].sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName)))
    }
    setLoading(false)
  }

  function prevWeek() {
    const d = new Date(currentWeekStart)
    d.setUTCDate(d.getUTCDate() - 7)
    const ws = d.toISOString().slice(0, 10)
    setCurrentWeekStart(ws)
    fetchWeek(ws, empFilter)
  }

  function nextWeek() {
    const d = new Date(currentWeekStart)
    d.setUTCDate(d.getUTCDate() + 7)
    const ws = d.toISOString().slice(0, 10)
    setCurrentWeekStart(ws)
    fetchWeek(ws, empFilter)
  }

  function onEmpChange(empId: string) {
    setEmpFilter(empId)
    fetchWeek(currentWeekStart, empId)
  }

  const we = weekEnd(currentWeekStart)
  const totalMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0)
  const billableMinutes = rows.reduce((s, r) => s + r.billableMinutes, 0)

  // Group by employee
  const byEmployee = new Map<string, { name: string; rows: WeeklySummaryRow[]; total: number; billable: number }>()
  for (const r of rows) {
    const existing = byEmployee.get(r.employeeId)
    if (existing) {
      existing.rows.push(r)
      existing.total += r.totalMinutes
      existing.billable += r.billableMinutes
    } else {
      byEmployee.set(r.employeeId, { name: r.employeeName, rows: [r], total: r.totalMinutes, billable: r.billableMinutes })
    }
  }

  const selectStyle: React.CSSProperties = {
    height: 32,
    padding: '0 8px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-sm)',
    font: '13px/1 var(--font-sans)',
    color: 'var(--fg-1)',
    background: 'var(--bg-1)',
  }

  const navBtnStyle: React.CSSProperties = {
    height: 32,
    width: 32,
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-sm)',
    background: 'var(--bg-1)',
    color: 'var(--fg-2)',
    cursor: 'pointer',
    font: '14px/1 var(--font-sans)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={{ padding: 'var(--s-5)', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Ringkasan Mingguan
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
          {totalMinutes > 0
            ? `${formatDuration(totalMinutes)} total · ${formatDuration(billableMinutes)} billable`
            : 'Tidak ada entri minggu ini'}
        </p>
      </div>

      {/* Week nav + filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={navBtnStyle} onClick={prevWeek} disabled={loading}>‹</button>
        <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)', minWidth: 200, textAlign: 'center' }}>
          {currentWeekStart} — {we}
        </span>
        <button style={navBtnStyle} onClick={nextWeek} disabled={loading}>›</button>
        <select style={{ ...selectStyle, marginLeft: 8 }} value={empFilter} onChange={(e) => onEmpChange(e.target.value)}>
          <option value="">Semua karyawan</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {loading && <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Memuat…</span>}
      </div>

      {/* Summary cards per employee */}
      {byEmployee.size === 0 ? (
        <div style={{ padding: 'var(--s-6)', textAlign: 'center', color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
          Tidak ada entri untuk periode ini.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          {[...byEmployee.entries()].map(([empId, { name, rows: empRows, total, billable }]) => (
            <div
              key={empId}
              style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}
            >
              {/* Employee header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{name}</span>
                <div style={{ display: 'flex', gap: 'var(--s-4)' }}>
                  <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {formatDuration(billable)} billable
                  </span>
                  <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--indigo)' }}>
                    {formatDuration(total)} total
                  </span>
                </div>
              </div>
              {/* Rows */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {empRows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: i < empRows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{ padding: '8px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', width: 120 }}>
                        {r.date}
                      </td>
                      <td style={{ padding: '8px 16px', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                        {r.projectId ? `Proyek` : '—'}
                      </td>
                      <td style={{ padding: '8px 16px', font: '600 13px/1 var(--font-mono, monospace)', color: 'var(--fg-1)', textAlign: 'right' }}>
                        {formatDuration(r.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
