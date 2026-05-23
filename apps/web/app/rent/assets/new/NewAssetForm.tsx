'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ASSET_CATEGORY_LABEL } from '../../../../lib/rent-shared'

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

// Per-category metadata fields. PMS-style fields for property/room.
const META_FIELDS: Record<string, { key: string; label: string; type: string }[]> = {
  equipment: [
    { key: 'brand', label: 'Merek', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'serial_number', label: 'Nomor Seri', type: 'text' },
  ],
  vehicle: [
    { key: 'plate_number', label: 'Nomor Polisi', type: 'text' },
    { key: 'brand', label: 'Merek', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'year', label: 'Tahun', type: 'number' },
  ],
  property: [
    { key: 'address_full', label: 'Alamat lengkap', type: 'text' },
    { key: 'bedrooms', label: 'Jumlah kamar tidur', type: 'number' },
    { key: 'bathrooms', label: 'Jumlah kamar mandi', type: 'number' },
    { key: 'area_sqm', label: 'Luas (m²)', type: 'number' },
  ],
  room: [
    { key: 'room_type', label: 'Tipe kamar', type: 'text' },
    { key: 'max_guests', label: 'Maks. tamu', type: 'number' },
    { key: 'floor', label: 'Lantai', type: 'number' },
  ],
  venue: [
    { key: 'capacity', label: 'Kapasitas', type: 'number' },
    { key: 'setup', label: 'Setup standar', type: 'text' },
  ],
  other: [],
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
      {children}
      {hint && <span style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</span>}
    </div>
  )
}

export function NewAssetForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [category, setCategory] = useState<string>('equipment')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [weeklyRate, setWeeklyRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [metadata, setMetadata] = useState<Record<string, string>>({})

  function parseNum(s: string): number | null {
    if (!s.trim()) return null
    const n = Number(s.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    // Strip empty metadata values
    const cleanMeta: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(metadata)) {
      if (v && v.trim()) cleanMeta[k] = v.trim()
    }

    const res = await fetch('/api/rent/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, assetCode, category, location, description,
        hourlyRate: parseNum(hourlyRate),
        dailyRate: parseNum(dailyRate),
        weeklyRate: parseNum(weeklyRate),
        monthlyRate: parseNum(monthlyRate),
        depositAmount: parseNum(depositAmount),
        metadata: cleanMeta,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/rent/assets/${data.asset.id}`)
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal menyimpan.' }))
    setError(data.error ?? 'Gagal menyimpan.')
    setPending(false)
  }

  const sectionTitle = (t: string) => (
    <div
      style={{
        font: '600 11px/1 var(--font-sans)',
        color: 'var(--fg-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        paddingBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {t}
    </div>
  )

  const metaFields = META_FIELDS[category] ?? []

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-6)' }}>
          Tambah Aset
        </h1>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#b91c1c', marginBottom: 'var(--s-4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          {sectionTitle('Info Dasar')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
            <Field label="Nama aset *">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Kode aset" hint="Misal: VHC-001, RM-203">
              <input style={inputStyle} value={assetCode} onChange={(e) => setAssetCode(e.target.value)} />
            </Field>
            <Field label="Kategori *">
              <select style={{ ...inputStyle, paddingRight: 8 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(ASSET_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Lokasi">
              <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
          </div>

          <Field label="Deskripsi">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
            />
          </Field>

          {metaFields.length > 0 && (
            <>
              {sectionTitle(`Spesifikasi — ${ASSET_CATEGORY_LABEL[category as keyof typeof ASSET_CATEGORY_LABEL]}`)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
                {metaFields.map((f) => (
                  <Field key={f.key} label={f.label}>
                    <input
                      style={inputStyle}
                      type={f.type}
                      value={metadata[f.key] ?? ''}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </Field>
                ))}
              </div>
            </>
          )}

          {sectionTitle('Tarif Sewa (IDR)')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-4)' }}>
            <Field label="Tarif per jam" hint="Kosongkan jika tidak ditawarkan">
              <input style={inputStyle} type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
            </Field>
            <Field label="Tarif per hari">
              <input style={inputStyle} type="number" min={0} value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            </Field>
            <Field label="Tarif per minggu">
              <input style={inputStyle} type="number" min={0} value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} />
            </Field>
            <Field label="Tarif per bulan" hint="Untuk sewa jangka panjang / PMS">
              <input style={inputStyle} type="number" min={0} value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} />
            </Field>
            <Field label="Deposit / Jaminan">
              <input style={inputStyle} type="number" min={0} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </Field>
          </div>

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
              {pending ? 'Menyimpan…' : 'Simpan Aset'}
            </button>
            <a
              href="/rent/assets"
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
