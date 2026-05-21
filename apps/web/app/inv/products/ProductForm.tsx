'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountOpt { id: string; code: string; name: string }
interface CategoryOpt { id: string; name: string }
interface UomOpt { id: string; name: string; symbol: string | null }
interface TaxOpt { id: string; name: string; isWithholding: boolean }

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

const TYPES = [
  { value: 'product',     label: 'Produk (stok fisik)' },
  { value: 'service',     label: 'Layanan (jasa)' },
  { value: 'consumable',  label: 'Konsumabel (fisik, tidak dilacak)' },
]

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
  initial?: {
    code?: string; name?: string; description?: string; type?: string
    categoryId?: string; uomId?: string; salePrice?: number; costPrice?: number
    revenueAccountId?: string; expenseAccountId?: string
    defaultSaleTaxIds?: string[]; defaultPurchaseTaxIds?: string[]
    notes?: string; isActive?: boolean
  }
  revenueAccounts: AccountOpt[]
  expenseAccounts: AccountOpt[]
  categories: CategoryOpt[]
  uomList: UomOpt[]
  taxes: TaxOpt[]
}

export function ProductForm({
  mode, productId, initial = {},
  revenueAccounts, expenseAccounts, categories, uomList, taxes,
}: ProductFormProps) {
  const router = useRouter()
  const [code, setCode] = useState(initial.code ?? '')
  const [name, setName] = useState(initial.name ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [type, setType] = useState(initial.type ?? 'product')
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? '')
  const [uomId, setUomId] = useState(initial.uomId ?? '')
  const [salePrice, setSalePrice] = useState(initial.salePrice ?? 0)
  const [costPrice, setCostPrice] = useState(initial.costPrice ?? 0)
  const [revenueAccountId, setRevenueAccountId] = useState(initial.revenueAccountId ?? '')
  const [expenseAccountId, setExpenseAccountId] = useState(initial.expenseAccountId ?? '')
  const [saleTaxIds, setSaleTaxIds] = useState<string[]>(initial.defaultSaleTaxIds ?? [])
  const [purchaseTaxIds, setPurchaseTaxIds] = useState<string[]>(initial.defaultPurchaseTaxIds ?? [])
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTax(ids: string[], setIds: (v: string[]) => void, id: string) {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Nama produk wajib diisi.')
    setSubmitting(true)

    const body = {
      code: code.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      type,
      categoryId: categoryId || null,
      uomId: uomId || null,
      salePrice,
      costPrice,
      revenueAccountId: revenueAccountId || null,
      expenseAccountId: expenseAccountId || null,
      defaultSaleTaxIds: saleTaxIds,
      defaultPurchaseTaxIds: purchaseTaxIds,
      notes: notes.trim() || null,
    }

    const url = mode === 'create' ? '/api/inv/products' : `/api/inv/products/${productId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal menyimpan produk.')
      setSubmitting(false)
      return
    }
    router.push('/inv/products')
  }

  async function onArchive() {
    if (!productId) return
    setArchiving(true)
    await fetch(`/api/inv/products/${productId}`, { method: 'DELETE' })
    router.push('/inv/products')
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 720 }}>

      {/* Basic info */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <SectionTitle>Informasi Dasar</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--s-3)' }}>
          <Field label="Kode SKU">
            <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Opsional" />
          </Field>
          <Field label="Nama Produk / Layanan *">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Tipe">
            <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Kategori">
            <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— Tanpa Kategori —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Satuan (UOM)">
            <select style={inputStyle} value={uomId} onChange={(e) => setUomId(e.target.value)}>
              <option value="">— Pilih Satuan —</option>
              {uomList.map((u) => <option key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ''}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Deskripsi">
          <textarea style={{ ...inputStyle, height: 'auto' }} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </section>

      {/* Pricing */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <SectionTitle>Harga</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Harga Jual (IDR)">
            <input style={inputStyle} type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(parseInt(e.target.value || '0', 10))} />
          </Field>
          <Field label="HPP / Harga Pokok (IDR)">
            <input style={inputStyle} type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(parseInt(e.target.value || '0', 10))} />
          </Field>
        </div>
      </section>

      {/* Accounting */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <SectionTitle>Akun & Pajak Default</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Akun Pendapatan">
            <select style={inputStyle} value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)}>
              <option value="">— Pilih Akun —</option>
              {revenueAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </Field>
          <Field label="Akun Beban / HPP">
            <select style={inputStyle} value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)}>
              <option value="">— Pilih Akun —</option>
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </Field>
        </div>
        {taxes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            <div>
              <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>Pajak Penjualan Default</div>
              <TaxPicker taxes={taxes} selected={saleTaxIds} onToggle={(id) => toggleTax(saleTaxIds, setSaleTaxIds, id)} />
            </div>
            <div>
              <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>Pajak Pembelian Default</div>
              <TaxPicker taxes={taxes} selected={purchaseTaxIds} onToggle={(id) => toggleTax(purchaseTaxIds, setPurchaseTaxIds, id)} />
            </div>
          </div>
        )}
      </section>

      {/* Notes */}
      <Field label="Catatan Internal">
        <textarea style={{ ...inputStyle, height: 'auto' }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
        <button type="submit" disabled={submitting}
          style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
          {submitting ? 'Menyimpan…' : mode === 'create' ? 'Simpan Produk' : 'Simpan Perubahan'}
        </button>
        {mode === 'edit' && (
          <button type="button" onClick={onArchive} disabled={archiving}
            style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--fg-3)', font: '500 13px/1 var(--font-sans)', border: '1px solid var(--border)', cursor: archiving ? 'wait' : 'pointer' }}>
            {archiving ? 'Mengarsipkan…' : 'Arsipkan Produk'}
          </button>
        )}
      </div>
    </form>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
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

function TaxPicker({ taxes, selected, onToggle }: { taxes: TaxOpt[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {taxes.map((t) => {
        const on = selected.includes(t.id)
        return (
          <button key={t.id} type="button" onClick={() => onToggle(t.id)}
            style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${on ? 'var(--indigo)' : 'var(--border)'}`,
              background: on ? 'var(--indigo-light, #eef0ff)' : 'transparent',
              color: on ? 'var(--indigo)' : 'var(--fg-3)',
              font: '500 11px/1 var(--font-sans)', cursor: 'pointer',
            }}>
            {t.name}
          </button>
        )
      })}
    </div>
  )
}
