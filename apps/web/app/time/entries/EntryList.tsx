'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { TimesheetEntryRow } from '../../../lib/timesheet'
import { formatDuration } from '../../../lib/timesheet'
import type { Employee } from '@kantorcore/db'

const BILLABLE_DOT: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
}

export function EntryList({
  initialEntries,
  employees,
}: {
  initialEntries: TimesheetEntryRow[]
  employees: Employee[]
}) {
  const [empFilter, setEmpFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [billableFilter, setBillableFilter] = useState('')

  const filtered = initialEntries.filter((e) => {
    if (empFilter && e.employeeId !== empFilter) return false
    if (dateFrom && e.date < dateFrom) return false
    if (dateTo && e.date > dateTo) return false
    if (billableFilter === 'yes' && !e.billable) return false
    if (billableFilter === 'no' && e.billable) return false
    return true
  })

  const totalMinutes = filtered.reduce((s, e) => s + e.durationMinutes, 0)

  const selectStyle: React.CSSProperties = {
    height: 32,
    padding: '0 8px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-sm)',
    font: '13px/1 var(--font-sans)',
    color: 'var(--fg-1)',
    background: 'var(--bg-1)',
  }

  const inputStyle: React.CSSProperties = {
    height: 32,
    padding: '0 8px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-sm)',
    font: '13px/1 var(--font-sans)',
    color: 'var(--fg-1)',
    background: 'var(--bg-1)',
  }

  return (
    <div style={{ padding: 'var(--s-5)', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Entri Waktu
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
            {filtered.length} entri · {formatDuration(totalMinutes)} total
          </p>
        </div>
        <Link
          href="/time/entries/new"
          style={{
            height: 34,
            padding: '0 14px',
            background: 'var(--indigo)',
            color: '#fff',
            borderRadius: 'var(--r-sm)',
            font: '500 13px/34px var(--font-sans)',
            textDecoration: 'none',
          }}
        >
          + Log Waktu
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={selectStyle} value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
          <option value="">Semua karyawan</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <input
          type="date"
          style={inputStyle}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Dari tanggal"
        />
        <span style={{ color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>–</span>
        <input
          type="date"
          style={inputStyle}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Sampai tanggal"
        />
        <select style={selectStyle} value={billableFilter} onChange={(e) => setBillableFilter(e.target.value)}>
          <option value="">Semua jenis</option>
          <option value="yes">Billable</option>
          <option value="no">Non-billable</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: 'var(--s-6)', textAlign: 'center', color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)' }}>
          Belum ada entri waktu.{' '}
          <Link href="/time/entries/new" style={{ color: 'var(--indigo)', textDecoration: 'none' }}>
            Log waktu sekarang
          </Link>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Tanggal', 'Karyawan', 'Durasi', 'Deskripsi', 'Jenis', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      font: '500 11px/1 var(--font-sans)',
                      color: 'var(--fg-3)',
                      textAlign: 'left',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: 'var(--bg-1)',
                  }}
                >
                  <td style={{ padding: '10px 12px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                    {entry.date}
                  </td>
                  <td style={{ padding: '10px 12px', font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                    {entry.employeeName}
                  </td>
                  <td style={{ padding: '10px 12px', font: '600 13px/1 var(--font-mono, monospace)', color: 'var(--indigo)', whiteSpace: 'nowrap' }}>
                    {formatDuration(entry.durationMinutes)}
                  </td>
                  <td style={{ padding: '10px 12px', font: '13px/1.4 var(--font-sans)', color: 'var(--fg-2)', maxWidth: 300 }}>
                    {entry.description ?? <span style={{ color: 'var(--fg-3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span
                        style={{
                          ...BILLABLE_DOT,
                          background: entry.billable ? 'var(--teal)' : 'var(--fg-3)',
                        }}
                      />
                      <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                        {entry.billable ? 'Billable' : 'Non-billable'}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <Link
                      href={`/time/entries/${entry.id}`}
                      style={{ font: '12px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
                    >
                      Detail
                    </Link>
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
