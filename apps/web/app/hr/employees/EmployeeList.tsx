'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EmployeeWithDept } from '../../../lib/hr-shared'
import { EMPLOYMENT_TYPE_LABEL, EMPLOYEE_STATUS_LABEL } from '../../../lib/hr-shared'
import type { Department } from '@kantorcore/db'

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--teal)',
  inactive: 'var(--fg-3)',
  terminated: 'var(--danger, #c0392b)',
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--indigo-light)',
        color: 'var(--indigo)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '600 11px/1 var(--font-sans)',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

export function EmployeeList({
  initialEmployees,
  departments,
}: {
  initialEmployees: EmployeeWithDept[]
  departments: Department[]
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [deptFilter, setDeptFilter] = useState<string>('')

  const filtered = initialEmployees.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false
    if (deptFilter && e.departmentId !== deptFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.name.toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q) ||
        (e.employeeCode ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: 'var(--s-4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
          flexShrink: 0,
        }}
      >
        <h1 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Karyawan
          <span style={{ font: '400 13px/1 var(--font-sans)', color: 'var(--fg-3)', marginLeft: 8 }}>
            {filtered.length}
          </span>
        </h1>
        <Link
          href="/hr/employees/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 32,
            padding: '0 12px',
            borderRadius: 'var(--r-sm)',
            background: 'var(--indigo)',
            color: '#fff',
            font: '500 13px/1 var(--font-sans)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          + Tambah Karyawan
        </Link>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: '10px var(--s-4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 'var(--s-2)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Cari karyawan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            height: 30,
            padding: '0 10px',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-sm)',
            font: '13px/1 var(--font-sans)',
            color: 'var(--fg-1)',
            background: 'var(--bg-1)',
            width: 200,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: 30,
            padding: '0 8px',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-sm)',
            font: '13px/1 var(--font-sans)',
            color: 'var(--fg-1)',
            background: 'var(--bg-1)',
          }}
        >
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="terminated">Diberhentikan</option>
        </select>
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              height: 30,
              padding: '0 8px',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              font: '13px/1 var(--font-sans)',
              color: 'var(--fg-1)',
              background: 'var(--bg-1)',
            }}
          >
            <option value="">Semua departemen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 'var(--s-8)',
              textAlign: 'center',
              font: '14px/1.5 var(--font-sans)',
              color: 'var(--fg-3)',
            }}
          >
            {initialEmployees.length === 0
              ? 'Belum ada karyawan. Tambahkan karyawan pertama.'
              : 'Tidak ada karyawan yang cocok dengan filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Karyawan', 'Jabatan', 'Departemen', 'Tipe', 'Status', 'Bergabung'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 16px',
                      font: '500 11px/1 var(--font-sans)',
                      color: 'var(--fg-3)',
                      textAlign: 'left',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <Link
                      href={`/hr/employees/${emp.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                    >
                      <Avatar name={emp.name} />
                      <div>
                        <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                          {emp.name}
                        </div>
                        {emp.employeeCode && (
                          <div style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)', marginTop: 3 }}>
                            {emp.employeeCode}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {emp.position ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {emp.departmentName ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {EMPLOYMENT_TYPE_LABEL[emp.employmentType]}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        font: '12px/1 var(--font-sans)',
                        color: STATUS_COLOR[emp.status] ?? 'var(--fg-3)',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: STATUS_COLOR[emp.status] ?? 'var(--fg-3)',
                        }}
                      />
                      {EMPLOYEE_STATUS_LABEL[emp.status]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {emp.hireDate
                      ? new Date(emp.hireDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
