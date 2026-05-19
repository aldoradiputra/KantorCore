'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Asset } from '@kantorcore/db'
import { ASSET_CATEGORY_LABEL, ASSET_STATUS_LABEL, formatIDR } from '../../../lib/rent'

const STATUS_COLOR: Record<string, string> = {
  available: 'var(--teal)',
  reserved: 'var(--amber)',
  rented: 'var(--indigo)',
  maintenance: 'var(--fg-3)',
  retired: '#c0392b',
}

export function AssetList({ initialAssets }: { initialAssets: Asset[] }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = initialAssets.filter((a) => {
    if (categoryFilter && a.category !== categoryFilter) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        (a.assetCode ?? '').toLowerCase().includes(q) ||
        (a.location ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const bestRate = (a: Asset) =>
    a.dailyRate ?? a.hourlyRate ?? a.weeklyRate ?? a.monthlyRate ?? null
  const bestRateUnit = (a: Asset): string =>
    a.dailyRate ? '/hari' : a.hourlyRate ? '/jam' : a.weeklyRate ? '/minggu' : a.monthlyRate ? '/bulan' : ''

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
          flexShrink: 0,
          gap: 'var(--s-3)',
        }}
      >
        <h1 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Aset
          <span style={{ font: '400 13px/1 var(--font-sans)', color: 'var(--fg-3)', marginLeft: 8 }}>
            {filtered.length}
          </span>
        </h1>
        <Link
          href="/rent/assets/new"
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
          }}
        >
          + Tambah Aset
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
          placeholder="Cari aset…"
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
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="">Semua kategori</option>
          {Object.entries(ASSET_CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">Semua status</option>
          {Object.entries(ASSET_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
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
            {initialAssets.length === 0
              ? 'Belum ada aset. Tambahkan aset pertama untuk mulai disewakan.'
              : 'Tidak ada aset yang cocok dengan filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Aset', 'Kategori', 'Lokasi', 'Tarif', 'Status'].map((h) => (
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
              {filtered.map((a) => {
                const rate = bestRate(a)
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <Link href={`/rent/assets/${a.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{a.name}</div>
                        {a.assetCode && (
                          <div style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)', marginTop: 3 }}>
                            {a.assetCode}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                      {ASSET_CATEGORY_LABEL[a.category]}
                    </td>
                    <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                      {a.location ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                      {rate != null ? (
                        <>
                          {formatIDR(rate)}
                          <span style={{ color: 'var(--fg-3)', marginLeft: 3 }}>{bestRateUnit(a)}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          font: '12px/1 var(--font-sans)',
                          color: STATUS_COLOR[a.status] ?? 'var(--fg-3)',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[a.status] ?? 'var(--fg-3)' }} />
                        {ASSET_STATUS_LABEL[a.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  height: 30,
  padding: '0 8px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg-1)',
}
