'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  RESERVATION_STATUS_LABEL,
  formatIDR,
  type ReservationWithRelations,
} from '../../../lib/rent'

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--fg-3)',
  confirmed: 'var(--amber)',
  active: 'var(--indigo)',
  completed: 'var(--teal)',
  cancelled: '#c0392b',
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ReservationList({ initialReservations }: { initialReservations: ReservationWithRelations[] }) {
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = statusFilter ? initialReservations.filter((r) => r.status === statusFilter) : initialReservations

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 'var(--s-4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <h1 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Reservasi
          <span style={{ font: '400 13px/1 var(--font-sans)', color: 'var(--fg-3)', marginLeft: 8 }}>
            {filtered.length}
          </span>
        </h1>
        <Link
          href="/rent/reservations/new"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px',
            borderRadius: 'var(--r-sm)', background: 'var(--indigo)', color: '#fff',
            font: '500 13px/1 var(--font-sans)', textDecoration: 'none',
          }}
        >
          + Reservasi Baru
        </Link>
      </div>

      <div style={{ padding: '10px var(--s-4)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: 30, padding: '0 8px',
            border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)',
            font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--bg-1)',
          }}
        >
          <option value="">Semua status</option>
          {Object.entries(RESERVATION_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '14px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            {initialReservations.length === 0 ? 'Belum ada reservasi.' : 'Tidak ada reservasi yang cocok.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Aset', 'Pelanggan', 'Mulai', 'Selesai', 'Total', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '8px 16px', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/rent/reservations/${r.id}`} style={{ textDecoration: 'none', font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                      {r.assetName}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {r.customerName}
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {formatDate(r.startAt)}
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {formatDate(r.endAt)}
                  </td>
                  <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {formatIDR(r.totalAmount)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        font: '12px/1 var(--font-sans)',
                        color: STATUS_COLOR[r.status] ?? 'var(--fg-3)',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[r.status] ?? 'var(--fg-3)' }} />
                      {RESERVATION_STATUS_LABEL[r.status]}
                    </span>
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
