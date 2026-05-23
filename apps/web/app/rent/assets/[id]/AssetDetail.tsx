'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Asset } from '@kantorcore/db'
import {
  ASSET_CATEGORY_LABEL,
  ASSET_STATUS_LABEL,
  RESERVATION_STATUS_LABEL,
  formatIDR,
  type ReservationWithRelations,
} from '../../../../lib/rent-shared'

const STATUS_COLOR: Record<string, string> = {
  available: 'var(--teal)',
  reserved: 'var(--amber)',
  rented: 'var(--indigo)',
  maintenance: 'var(--fg-3)',
  retired: '#c0392b',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>{value || '—'}</span>
    </div>
  )
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AssetDetail({
  asset,
  reservations,
}: {
  asset: Asset
  reservations: ReservationWithRelations[]
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function onDelete() {
    if (!confirm(`Hapus aset "${asset.name}"?`)) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/rent/assets/${asset.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/rent/assets')
      return
    }
    const data = await res.json().catch(() => ({}))
    setDeleteError(data.error ?? 'Gagal menghapus.')
    setDeleting(false)
  }

  const metadata = (asset.metadata ?? {}) as Record<string, unknown>

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)', marginBottom: 'var(--s-6)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>
              {asset.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                {ASSET_CATEGORY_LABEL[asset.category]}
              </span>
              {asset.assetCode && (
                <>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)' }}>{asset.assetCode}</span>
                </>
              )}
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  font: '12px/1 var(--font-sans)',
                  color: STATUS_COLOR[asset.status] ?? 'var(--fg-3)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[asset.status] ?? 'var(--fg-3)' }} />
                {ASSET_STATUS_LABEL[asset.status]}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexShrink: 0 }}>
            <Link
              href={`/rent/reservations/new?assetId=${asset.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 14px',
                borderRadius: 'var(--r-sm)', background: 'var(--indigo)', color: '#fff',
                font: '500 13px/1 var(--font-sans)', textDecoration: 'none',
              }}
            >
              + Reservasi
            </Link>
            <button
              onClick={onDelete}
              disabled={deleting}
              style={{
                height: 32, padding: '0 14px', borderRadius: 'var(--r-sm)',
                border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c',
                font: '500 13px/1 var(--font-sans)',
                cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? 'Menghapus…' : 'Hapus'}
            </button>
          </div>
        </div>

        {deleteError && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#b91c1c', marginBottom: 'var(--s-4)' }}>
            {deleteError}
          </div>
        )}

        {/* Info */}
        <section style={{ marginBottom: 'var(--s-6)' }}>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
            Detail
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-5)' }}>
            <InfoRow label="Lokasi" value={asset.location} />
            <InfoRow label="Tarif per jam" value={formatIDR(asset.hourlyRate)} />
            <InfoRow label="Tarif per hari" value={formatIDR(asset.dailyRate)} />
            <InfoRow label="Tarif per minggu" value={formatIDR(asset.weeklyRate)} />
            <InfoRow label="Tarif per bulan" value={formatIDR(asset.monthlyRate)} />
            <InfoRow label="Deposit" value={formatIDR(asset.depositAmount)} />
          </div>
          {asset.description && (
            <div style={{ marginTop: 'var(--s-4)' }}>
              <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deskripsi
              </span>
              <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                {asset.description}
              </p>
            </div>
          )}
        </section>

        {/* Metadata */}
        {Object.keys(metadata).length > 0 && (
          <section style={{ marginBottom: 'var(--s-6)' }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
              Spesifikasi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-5)' }}>
              {Object.entries(metadata).map(([k, v]) => (
                <InfoRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
              ))}
            </div>
          </section>
        )}

        {/* Reservations */}
        <section>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
            Reservasi terbaru
          </div>
          {reservations.length === 0 ? (
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>Belum ada reservasi untuk aset ini.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {reservations.map((r) => (
                <Link
                  key={r.id}
                  href={`/rent/reservations/${r.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    height: 44, padding: '0 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-1)', textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{r.customerName}</span>
                    <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                      {formatDate(r.startAt)} — {formatDate(r.endAt)}
                    </span>
                  </div>
                  <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {RESERVATION_STATUS_LABEL[r.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
