'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { formatIDR } from '../../../components/charts'
import type { SalesOrder, SoStatus } from '../../../lib/sales'

const STATUS_LABEL: Record<SoStatus, string> = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}

const STATUS_COLOR: Record<SoStatus, { bg: string; fg: string }> = {
  quotation: { bg: 'var(--bg)',           fg: 'var(--fg-3)' },
  confirmed: { bg: 'var(--indigo-light)', fg: 'var(--indigo)' },
  done:      { bg: '#D1FAE5',             fg: '#065F46' },
  cancelled: { bg: '#FEE2E2',             fg: '#991B1B' },
}

const STATUSES: SoStatus[] = ['quotation', 'confirmed', 'done', 'cancelled']

interface Props {
  initialOrders: SalesOrder[]
  teams:         { id: string; name: string }[]
  initialStatus: SoStatus | null
  initialTeamId: string | null
}

export default function OrdersPanel({ initialOrders, teams, initialStatus, initialTeamId }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [search, setSearch]         = useState('')
  const [filterStatus, setStatus]   = useState<SoStatus | ''>(initialStatus ?? '')
  const [filterTeam, setTeam]       = useState<string>(initialTeamId ?? '')

  const filtered = useMemo(() => {
    let rows = initialOrders
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((o) =>
        `${o.soNumber} ${o.customerName}`.toLowerCase().includes(q)
      )
    }
    if (filterStatus) rows = rows.filter((o) => o.status === filterStatus)
    if (filterTeam)   rows = rows.filter((o) => o.teamId === filterTeam)
    return rows
  }, [initialOrders, search, filterStatus, filterTeam])

  function updateUrl(next: { status?: SoStatus | ''; teamId?: string }) {
    const params = new URLSearchParams()
    const s = next.status !== undefined ? next.status : filterStatus
    const t = next.teamId !== undefined ? next.teamId : filterTeam
    if (s) params.set('status', s)
    if (t) params.set('teamId', t)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const total       = filtered.length
  const totalValue  = filtered.reduce((s, o) => s + o.totalAmount, 0)
  const isQuoteView = filterStatus === 'quotation'

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            {isQuoteView ? 'Penawaran' : 'Sales Order'}
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            {total} dokumen · Total {formatIDR(totalValue)}
          </p>
        </div>
        <Link
          href="/sales/orders/new"
          style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none' }}
        >
          + {isQuoteView ? 'Penawaran' : 'Order'} Baru
        </Link>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Cari nomor SO atau pelanggan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 200, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', background: 'var(--surface)', color: 'var(--fg-1)', outline: 'none' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => { const v = e.target.value as SoStatus | ''; setStatus(v); updateUrl({ status: v }) }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', background: 'var(--surface)', cursor: 'pointer' }}
        >
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {teams.length > 0 && (
          <select
            value={filterTeam}
            onChange={(e) => { setTeam(e.target.value); updateUrl({ teamId: e.target.value }) }}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            <option value="">Semua Tim</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Status quick filter chips */}
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', flexShrink: 0 }}>
        {STATUSES.map((s) => {
          const count = initialOrders.filter((o) => o.status === s).length
          const colors = STATUS_COLOR[s]
          return (
            <button
              key={s}
              onClick={() => { const next = filterStatus === s ? '' : s; setStatus(next); updateUrl({ status: next }) }}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                background: filterStatus === s ? colors.bg : 'var(--bg)',
                color:      filterStatus === s ? colors.fg : 'var(--fg-3)',
                font: '12px/1 var(--font-sans)',
                cursor: 'pointer',
                fontWeight: filterStatus === s ? 600 : 400,
              }}
            >
              {STATUS_LABEL[s]} {count}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              {['#', 'Nomor', 'Pelanggan', 'Tanggal', 'Jatuh Tempo', 'Total', 'Status'].map((h) => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--fg-3)' }}>Tidak ada dokumen ditemukan.</td></tr>
            ) : (
              filtered.map((so, i) => {
                const colors = STATUS_COLOR[so.status]
                return (
                  <tr key={so.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums', width: 40 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link href={`/sales/orders/${so.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                        {so.soNumber}
                      </Link>
                      {so.dealId && (
                        <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'var(--indigo-light)', color: 'var(--indigo)', fontSize: 10, fontWeight: 600 }}>
                          CRM
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-1)' }}>{so.customerName}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-2)', font: '12px/1 var(--font-mono, monospace)' }}>{so.date}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-3)', font: '12px/1 var(--font-mono, monospace)' }}>{so.paymentDueDate ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-1)', font: '600 13px/1 var(--font-mono, monospace)', textAlign: 'right' }}>
                      {so.totalAmount > 0 ? formatIDR(so.totalAmount) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--r-sm)',
                        background: colors.bg,
                        color: colors.fg,
                        font: '11px/1 var(--font-sans)',
                        fontWeight: 600,
                      }}>
                        {STATUS_LABEL[so.status]}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
