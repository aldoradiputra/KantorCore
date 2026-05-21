'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DiscountType } from '../../../lib/promotions'

const DISCOUNT_TYPES: Array<{ key: DiscountType; label: string }> = [
  { key: 'percentage',   label: 'Persentase (%)' },
  { key: 'fixed_amount', label: 'Nominal Tetap (Rp)' },
  { key: 'tiered',       label: 'Bertingkat (qty → diskon)' },
  { key: 'bogo',         label: 'Beli N Gratis M' },
  { key: 'bundle',       label: 'Harga Bundle' },
]

export default function PromoForm({ initial }: { initial?: Record<string, unknown> }) {
  const router = useRouter()
  const [name, setName] = useState((initial?.name as string) ?? '')
  const [description, setDescription] = useState((initial?.description as string) ?? '')
  const [discountType, setDiscountType] = useState<DiscountType>((initial?.discountType as DiscountType) ?? 'percentage')
  const [percent, setPercent] = useState(String((initial?.discountConfig as Record<string,unknown>)?.percent ?? 10))
  const [fixedAmount, setFixedAmount] = useState(String((initial?.discountConfig as Record<string,unknown>)?.amount ?? 0))
  const [bogoBuy, setBogoB] = useState(String((initial?.discountConfig as Record<string,unknown>)?.buy_qty ?? 2))
  const [bogoGet, setBogoG] = useState(String((initial?.discountConfig as Record<string,unknown>)?.get_qty ?? 1))
  const [bogoGetPct, setBogoGP] = useState(String((initial?.discountConfig as Record<string,unknown>)?.get_percent ?? 100))
  const [bundlePrice, setBundlePrice] = useState(String((initial?.discountConfig as Record<string,unknown>)?.bundle_price ?? 0))
  const [minOrderValue, setMinOrderValue] = useState(String((initial?.conditions as Record<string,unknown>)?.min_order_value ?? ''))
  const [validFrom, setValidFrom] = useState((initial?.validFrom as string) ?? '')
  const [validTo, setValidTo] = useState((initial?.validTo as string) ?? '')
  const [priority, setPriority] = useState(String((initial?.priority as number) ?? 0))
  const [status, setStatus] = useState<'active' | 'inactive'>((initial?.status as 'active' | 'inactive') ?? 'inactive')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildDiscountConfig(): Record<string, unknown> {
    switch (discountType) {
      case 'percentage':   return { percent: Number(percent) }
      case 'fixed_amount': return { amount: Math.round(Number(fixedAmount) * 100) }
      case 'bogo':         return { buy_qty: Number(bogoBuy), get_qty: Number(bogoGet), get_percent: Number(bogoGetPct) }
      case 'bundle':       return { bundle_price: Math.round(Number(bundlePrice) * 100) }
      default:             return {}
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const body = {
        name, description,
        discountType,
        discountConfig: buildDiscountConfig(),
        conditions: minOrderValue ? { min_order_value: Math.round(Number(minOrderValue) * 100) } : {},
        validFrom: validFrom || null,
        validTo: validTo || null,
        priority: Number(priority),
        status,
      }
      const res = await fetch('/api/promo/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Gagal menyimpan.')
        return
      }
      router.push('/promo/promotions')
      router.refresh()
    } catch {
      setError('Kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <Field label="Nama Promosi">
        <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} placeholder="Contoh: Diskon Akhir Tahun 20%" />
      </Field>

      <Field label="Deskripsi (opsional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
      </Field>

      <Field label="Tipe Diskon">
        <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} style={inputStyle}>
          {DISCOUNT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </Field>

      {discountType === 'percentage' && (
        <Field label="Persentase Diskon (%)">
          <input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} style={inputStyle} />
        </Field>
      )}

      {discountType === 'fixed_amount' && (
        <Field label="Nominal Diskon (Rp)">
          <input type="number" min={0} value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} style={inputStyle} />
        </Field>
      )}

      {discountType === 'bogo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Beli (qty)"><input type="number" min={1} value={bogoBuy} onChange={(e) => setBogoB(e.target.value)} style={inputStyle} /></Field>
          <Field label="Gratis (qty)"><input type="number" min={1} value={bogoGet} onChange={(e) => setBogoG(e.target.value)} style={inputStyle} /></Field>
          <Field label="Diskon item gratis (%)"><input type="number" min={0} max={100} value={bogoGetPct} onChange={(e) => setBogoGP(e.target.value)} style={inputStyle} /></Field>
        </div>
      )}

      {discountType === 'bundle' && (
        <Field label="Harga Bundle (Rp)">
          <input type="number" min={0} value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} style={inputStyle} />
        </Field>
      )}

      <Field label="Minimum Nilai Pesanan (Rp, opsional)">
        <input type="number" min={0} value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)} style={inputStyle} placeholder="0 = tidak ada minimum" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Berlaku Dari"><input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} style={inputStyle} /></Field>
        <Field label="Berlaku Hingga"><input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={inputStyle} /></Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Prioritas" hint="Angka lebih tinggi = diterapkan lebih dulu">
          <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')} style={inputStyle}>
            <option value="inactive">Nonaktif</option>
            <option value="active">Aktif</option>
          </select>
        </Field>
      </div>

      {error && (
        <div style={{ padding: 'var(--s-3)', background: 'var(--red-light)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        <button type="submit" disabled={saving} style={{
          height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)', color: 'var(--white)',
          border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)',
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Menyimpan…' : 'Simpan Promosi'}
        </button>
        <button type="button" onClick={() => router.back()} style={{
          height: 36, padding: '0 var(--s-4)', background: 'transparent', color: 'var(--fg-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
        }}>
          Batal
        </button>
      </div>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{label}</label>
      {children}
      {hint && <div style={{ font: '11px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</div>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 10px',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--surface)', width: '100%',
}
