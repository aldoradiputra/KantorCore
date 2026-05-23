'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  RESERVATION_STATUS_LABEL,
  RATE_UNIT_LABEL,
  ASSET_CATEGORY_LABEL,
  formatIDR,
  type ReservationWithRelations,
} from '../../../../lib/rent-shared'

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--fg-3)',
  confirmed: 'var(--amber)',
  active: 'var(--indigo)',
  completed: 'var(--teal)',
  cancelled: '#c0392b',
}

const TRANSITIONS: Record<string, { to: string; label: string; variant: 'primary' | 'secondary' | 'danger' }[]> = {
  draft: [
    { to: 'confirmed', label: 'Konfirmasi', variant: 'primary' },
    { to: 'cancelled', label: 'Batalkan', variant: 'danger' },
  ],
  confirmed: [
    { to: 'active', label: 'Mulai (Pick-up / Check-in)', variant: 'primary' },
    { to: 'cancelled', label: 'Batalkan', variant: 'danger' },
  ],
  active: [
    { to: 'completed', label: 'Selesai (Return / Check-out)', variant: 'primary' },
  ],
  completed: [],
  cancelled: [],
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

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ReservationDetail({ initialReservation }: { initialReservation: ReservationWithRelations }) {
  const [reservation, setReservation] = useState(initialReservation)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transition(newStatus: string) {
    setError(null)
    setPending(true)
    const res = await fetch(`/api/rent/reservations/${reservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Gagal mengubah status.')
      setPending(false)
      return
    }
    setReservation({ ...reservation, ...data.reservation })
    setPending(false)
  }

  const actions = TRANSITIONS[reservation.status] ?? []

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)', marginBottom: 'var(--s-6)' }}>
          <div>
            <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>
              Reservasi — {reservation.assetName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/rent/assets/${reservation.assetId}`} style={{ font: '13px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
                {ASSET_CATEGORY_LABEL[reservation.assetCategory]}
              </Link>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{reservation.customerName}</span>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  font: '12px/1 var(--font-sans)',
                  color: STATUS_COLOR[reservation.status] ?? 'var(--fg-3)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[reservation.status] ?? 'var(--fg-3)' }} />
                {RESERVATION_STATUS_LABEL[reservation.status]}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#b91c1c', marginBottom: 'var(--s-4)' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-6)', flexWrap: 'wrap' }}>
            {actions.map((a) => (
              <button
                key={a.to}
                onClick={() => transition(a.to)}
                disabled={pending}
                style={{
                  height: 34, padding: '0 16px', borderRadius: 'var(--r-sm)',
                  font: '500 13px/1 var(--font-sans)', cursor: pending ? 'not-allowed' : 'pointer',
                  opacity: pending ? 0.7 : 1,
                  border:
                    a.variant === 'danger' ? '1px solid #fecaca' :
                    a.variant === 'secondary' ? '1px solid var(--border-strong)' :
                    'none',
                  background:
                    a.variant === 'danger' ? '#fef2f2' :
                    a.variant === 'secondary' ? 'var(--surface)' :
                    'var(--indigo)',
                  color:
                    a.variant === 'danger' ? '#b91c1c' :
                    a.variant === 'secondary' ? 'var(--fg-2)' :
                    '#fff',
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Schedule */}
        <section style={{ marginBottom: 'var(--s-6)' }}>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
            Jadwal
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-5)' }}>
            <InfoRow label="Rencana mulai" value={formatDateTime(reservation.startAt)} />
            <InfoRow label="Rencana selesai" value={formatDateTime(reservation.endAt)} />
            <InfoRow label="Mulai aktual" value={formatDateTime(reservation.actualStartAt)} />
            <InfoRow label="Selesai aktual" value={formatDateTime(reservation.actualEndAt)} />
          </div>
        </section>

        {/* Pricing */}
        <section style={{ marginBottom: 'var(--s-6)' }}>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
            Tarif & Pembayaran
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-5)' }}>
            <InfoRow label={`Tarif per ${RATE_UNIT_LABEL[reservation.rateUnit].toLowerCase()}`} value={formatIDR(reservation.rateAmount)} />
            <InfoRow label="Total" value={<strong>{formatIDR(reservation.totalAmount)}</strong>} />
            <InfoRow label="Deposit" value={formatIDR(reservation.depositAmount)} />
            <InfoRow label="Deposit dikembalikan" value={reservation.depositReturned ? 'Ya' : 'Belum'} />
          </div>
        </section>

        {reservation.notes && (
          <section>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
              Catatan
            </div>
            <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {reservation.notes}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
