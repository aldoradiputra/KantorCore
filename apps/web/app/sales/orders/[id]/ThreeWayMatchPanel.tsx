'use client'

import { useState, useEffect } from 'react'

interface MatchRow {
  lineId:       string
  description:  string
  qty:          number
  deliveredQty: number
  invoicedQty:  number
  deliveryGap:  number
  invoiceGap:   number
  status:       'matched' | 'partial' | 'over' | 'pending'
}

const STATUS_LABEL: Record<MatchRow['status'], string> = {
  matched: 'Sesuai',
  partial: 'Sebagian',
  over:    'Melebihi',
  pending: 'Belum',
}
const STATUS_COLOR: Record<MatchRow['status'], string> = {
  matched: 'var(--teal, #0F7B6C)',
  partial: 'var(--amber, #B35A00)',
  over:    'var(--danger, #c33)',
  pending: 'var(--fg-3)',
}

export function ThreeWayMatchPanel({ soId }: { soId: string }) {
  const [rows, setRows] = useState<MatchRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/sales/orders/${soId}/three-way-match`)
      .then((r) => r.json())
      .then((j) => setRows(j.rows))
      .catch(() => setError('Gagal memuat data matching.'))
  }, [soId])

  if (error) return <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--danger, #c33)' }}>{error}</div>
  if (!rows) return <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Memuat…</div>

  const allMatched = rows.every((r) => r.status === 'matched')

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Kontrol 3-Jalur (Pesan / Kirim / Faktur)
        </span>
        {allMatched && (
          <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--teal, #0F7B6C)' }}>✓ Semua baris sesuai</span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
        <thead>
          <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <Th>Deskripsi</Th>
            <Th align="right">Dipesan</Th>
            <Th align="right">Dikirim</Th>
            <Th align="right">Difaktur</Th>
            <Th align="center">Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lineId} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 14px', color: 'var(--fg-1)' }}>{r.description}</td>
              <Num>{r.qty}</Num>
              <Num warn={r.deliveryGap > 0}>{r.deliveredQty}</Num>
              <Num warn={r.invoiceGap > 0}>{r.invoicedQty}</Num>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: 999,
                  font: '600 10px/1 var(--font-sans)',
                  color: STATUS_COLOR[r.status],
                  border: `1px solid ${STATUS_COLOR[r.status]}`,
                }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <th style={{ padding: '8px 14px', textAlign: align ?? 'left', font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </th>
  )
}

function Num({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: warn ? 'var(--amber, #B35A00)' : 'var(--fg-1)', fontWeight: warn ? 600 : 400 }}>
      {children}
    </td>
  )
}
