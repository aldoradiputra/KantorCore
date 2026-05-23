'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Asset, RentCustomer } from '@kantorcore/db'
import { ASSET_CATEGORY_LABEL, formatIDR } from '../../../../lib/rent-shared'

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg-1)',
  width: '100%',
  boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
      {children}
    </div>
  )
}

export function NewReservationForm({
  assets,
  customers,
  presetAssetId,
}: {
  assets: Asset[]
  customers: RentCustomer[]
  presetAssetId?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState(presetAssetId ?? '')
  const [customerId, setCustomerId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [rateUnit, setRateUnit] = useState('day')
  const [rateAmount, setRateAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [notes, setNotes] = useState('')

  // Inline new-customer toggle
  const [creatingCustomer, setCreatingCustomer] = useState(customers.length === 0)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const selectedAsset = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId])

  // Auto-fill rate when asset/unit changes
  function applyAssetRate(asset: Asset | undefined, unit: string) {
    if (!asset) return
    const r =
      unit === 'hour' ? asset.hourlyRate :
      unit === 'day' ? asset.dailyRate :
      unit === 'week' ? asset.weeklyRate :
      asset.monthlyRate
    if (r != null) setRateAmount(String(r))
    if (asset.depositAmount != null) setDepositAmount(String(asset.depositAmount))
  }

  function unitsBetween(unit: string, start: Date, end: Date): number {
    const ms = end.getTime() - start.getTime()
    const hours = ms / 3_600_000
    if (unit === 'hour') return Math.ceil(hours)
    if (unit === 'day') return Math.ceil(hours / 24)
    if (unit === 'week') return Math.ceil(hours / (24 * 7))
    return Math.ceil(hours / (24 * 30))
  }

  const computedTotal = useMemo(() => {
    const rate = Number(rateAmount)
    if (!rate || !startAt || !endAt) return 0
    const s = new Date(startAt)
    const e = new Date(endAt)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return 0
    return rate * unitsBetween(rateUnit, s, e)
  }, [rateAmount, rateUnit, startAt, endAt])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    let finalCustomerId = customerId
    if (creatingCustomer) {
      if (!newCustomerName.trim()) {
        setError('Nama pelanggan wajib diisi.')
        setPending(false)
        return
      }
      const cRes = await fetch('/api/rent/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName, email: newCustomerEmail, phone: newCustomerPhone }),
      })
      if (!cRes.ok) {
        const d = await cRes.json().catch(() => ({}))
        setError(d.error ?? 'Gagal membuat pelanggan.')
        setPending(false)
        return
      }
      const cData = await cRes.json()
      finalCustomerId = cData.customer.id
    }

    if (!finalCustomerId) {
      setError('Pelanggan wajib dipilih.')
      setPending(false)
      return
    }
    if (!assetId) {
      setError('Aset wajib dipilih.')
      setPending(false)
      return
    }

    const res = await fetch('/api/rent/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId, customerId: finalCustomerId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        rateUnit,
        rateAmount: Number(rateAmount) || 0,
        totalAmount: computedTotal,
        depositAmount: Number(depositAmount) || 0,
        notes,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/rent/reservations/${data.reservation.id}`)
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal menyimpan.' }))
    setError(data.error ?? 'Gagal menyimpan.')
    setPending(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-6)' }}>
          Reservasi Baru
        </h1>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#b91c1c', marginBottom: 'var(--s-4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <Field label="Aset *">
            <select
              style={{ ...inputStyle, paddingRight: 8 }}
              value={assetId}
              onChange={(e) => {
                setAssetId(e.target.value)
                applyAssetRate(assets.find((a) => a.id === e.target.value), rateUnit)
              }}
              required
            >
              <option value="">— Pilih aset —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({ASSET_CATEGORY_LABEL[a.category]})
                </option>
              ))}
            </select>
          </Field>

          {/* Customer picker / inline create */}
          {!creatingCustomer ? (
            <Field label="Pelanggan *">
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  style={{ ...inputStyle, paddingRight: 8 }}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">— Pilih pelanggan —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCreatingCustomer(true)}
                  style={{
                    height: 34, padding: '0 12px',
                    border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)',
                    background: 'var(--surface)', color: 'var(--fg-2)',
                    font: '500 13px/1 var(--font-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  + Baru
                </button>
              </div>
            </Field>
          ) : (
            <div style={{ padding: 'var(--s-3)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Pelanggan baru</span>
                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreatingCustomer(false)}
                    style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Pilih dari daftar
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
                <Field label="Nama *"><input style={inputStyle} value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} /></Field>
                <Field label="Telepon"><input style={inputStyle} value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} /></Field>
              </div>
              <Field label="Email"><input style={inputStyle} type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} /></Field>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
            <Field label="Mulai *">
              <input style={inputStyle} type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </Field>
            <Field label="Selesai *">
              <input style={inputStyle} type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </Field>
            <Field label="Unit tarif">
              <select
                style={{ ...inputStyle, paddingRight: 8 }}
                value={rateUnit}
                onChange={(e) => {
                  setRateUnit(e.target.value)
                  applyAssetRate(selectedAsset, e.target.value)
                }}
              >
                <option value="hour">Per jam</option>
                <option value="day">Per hari</option>
                <option value="week">Per minggu</option>
                <option value="month">Per bulan</option>
              </select>
            </Field>
            <Field label="Tarif (IDR)">
              <input style={inputStyle} type="number" min={0} value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} />
            </Field>
            <Field label="Deposit (IDR)">
              <input style={inputStyle} type="number" min={0} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </Field>
          </div>

          <div style={{ padding: 'var(--s-3)', background: 'var(--indigo-light)', borderRadius: 'var(--r-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Total estimasi</span>
            <span style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--indigo)' }}>{formatIDR(computedTotal)}</span>
          </div>

          <Field label="Catatan">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 'var(--s-3)', paddingTop: 'var(--s-2)' }}>
            <button
              type="submit"
              disabled={pending}
              style={{
                height: 36, padding: '0 20px', borderRadius: 'var(--r-sm)',
                background: 'var(--indigo)', color: '#fff',
                font: '500 13px/1 var(--font-sans)', border: 'none',
                cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? 'Menyimpan…' : 'Buat Reservasi'}
            </button>
            <a
              href="/rent/reservations"
              style={{
                height: 36, padding: '0 16px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border-strong)', color: 'var(--fg-2)',
                font: '500 13px/1 var(--font-sans)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              Batal
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
