'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProductOpt { id: string; name: string; code: string | null; uomSymbol: string | null }
interface LocationOpt { id: string; code: string; name: string }

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px',
  border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--bg-1)',
  width: '100%', boxSizing: 'border-box',
}

export function AdjustForm({ products, locations }: { products: ProductOpt[]; locations: LocationOpt[] }) {
  const router = useRouter()
  const [productId, setProductId]   = useState(products[0]?.id ?? '')
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [newQty, setNewQty]         = useState(0)
  const [reference, setReference]   = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  const selectedProduct = products.find((p) => p.id === productId)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!productId) return setError('Pilih produk.')
    if (!locationId) return setError('Pilih lokasi.')
    setSubmitting(true)

    const res = await fetch('/api/inv/stock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, locationId, newQty, reference: reference || undefined, notes: notes || undefined }),
    })

    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(j.error ?? 'Gagal menyesuaikan stok.')
      setSubmitting(false)
      return
    }

    const delta = j.delta as number
    const sign = delta > 0 ? '+' : ''
    setSuccess(`Stok disesuaikan. Delta: ${sign}${delta} ${selectedProduct?.uomSymbol ?? 'unit'}`)
    setNewQty(0)
    setReference('')
    setNotes('')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <Field label="Produk *">
        <select style={inputStyle} value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `[${p.code}] ` : ''}{p.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Lokasi Gudang *">
        <select style={inputStyle} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
          ))}
        </select>
      </Field>

      <Field label={`Jumlah Stok Aktual${selectedProduct?.uomSymbol ? ` (${selectedProduct.uomSymbol})` : ''} *`}>
        <input
          style={inputStyle} type="number" min={0}
          value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value || '0', 10))}
        />
      </Field>

      <Field label="Referensi">
        <input style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Opsional, mis: Stock Opname 2026-01" />
      </Field>

      <Field label="Catatan">
        <textarea style={{ ...inputStyle, height: 'auto' }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: '#e6f7f1', color: 'var(--teal)', font: '13px/1.4 var(--font-sans)' }}>
          {success}
        </div>
      )}

      <button type="submit" disabled={submitting}
        style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
        {submitting ? 'Menyimpan…' : 'Simpan Penyesuaian'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{label}</span>
      {children}
    </label>
  )
}
