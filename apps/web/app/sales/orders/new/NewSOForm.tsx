'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountOpt { id: string; code: string; name: string }
interface TaxOpt { id: string; name: string; amount: number; amountType: 'percent' | 'fixed' }
interface ContactOpt { id: string; name: string }
interface ProductOpt {
  id: string; name: string; code: string | null
  salePrice: number; defaultAccountId: string | null
  defaultTaxIds: string[]; uomSymbol: string | null
}
interface WarehouseOpt { id: string; code: string; name: string }

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px', border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg-1)', width: '100%', boxSizing: 'border-box',
}

const RECURRING_INTERVALS = [
  { value: 'monthly',   label: 'Bulanan' },
  { value: 'quarterly', label: 'Kuartalan' },
  { value: 'annual',    label: 'Tahunan' },
]

interface Line {
  productId:         string | null
  productType:       string | null
  description:       string
  qty:               number
  unitPrice:         number
  accountId:         string
  taxIds:            string[]
  warehouseId:       string | null
  recurringInterval: string | null
  recurringCount:    number | null
  nextBillingDate:   string | null
  showRecurring:     boolean
}

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d: string, n: number) => {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10)
}
const fmtIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

function nextNBillingDates(startDate: string, interval: string, count = 3): string[] {
  const out: string[] = []
  let d = new Date(startDate)
  for (let i = 0; i < count; i++) {
    switch (interval) {
      case 'monthly':   d = new Date(d); d.setMonth(d.getMonth() + 1); break
      case 'quarterly': d = new Date(d); d.setMonth(d.getMonth() + 3); break
      case 'annual':    d = new Date(d); d.setFullYear(d.getFullYear() + 1); break
    }
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function emptyLine(defaultAcct: string): Line {
  return {
    productId: null, productType: null, description: '', qty: 1, unitPrice: 0,
    accountId: defaultAcct, taxIds: [], warehouseId: null, recurringInterval: null,
    recurringCount: null, nextBillingDate: null, showRecurring: false,
  }
}

export function NewSOForm({ accounts, taxes, contacts, products, warehouses }: {
  accounts:   AccountOpt[]
  taxes:      TaxOpt[]
  contacts:   ContactOpt[]
  products:   ProductOpt[]
  warehouses: WarehouseOpt[]
}) {
  const router = useRouter()
  const defaultAcct = accounts[0]?.id ?? ''
  const [contactId, setContactId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [date, setDate] = useState(today())
  const [expiryDate, setExpiryDate] = useState(addDays(today(), 30))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine(defaultAcct)])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function toggleTax(i: number, taxId: string) {
    setLines((ls) => ls.map((l, idx) => {
      if (idx !== i) return l
      return l.taxIds.includes(taxId)
        ? { ...l, taxIds: l.taxIds.filter((id) => id !== taxId) }
        : { ...l, taxIds: [...l.taxIds, taxId] }
    }))
  }
  function addLine() { setLines((ls) => [...ls, emptyLine(defaultAcct)]) }
  function removeLine(i: number) { setLines((ls) => ls.filter((_, idx) => idx !== i)) }

  function handleSelectContact(id: string) {
    const c = contacts.find((x) => x.id === id)
    if (!c) return
    setContactId(c.id)
    setCustomerName(c.name)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!customerName.trim()) return setError('Nama pelanggan wajib diisi.')
    for (const l of lines) {
      if (!l.description.trim()) return setError('Deskripsi baris wajib diisi.')
      if (l.qty <= 0) return setError('Kuantitas harus lebih besar dari 0.')
      if (l.unitPrice < 0) return setError('Harga tidak boleh negatif.')
      if (l.recurringInterval && !l.nextBillingDate) {
        return setError('Tentukan tanggal tagihan pertama untuk baris berulang.')
      }
    }
    setSubmitting(true)
    const res = await fetch('/api/sales/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contactId,
        customerName,
        date,
        expiryDate: expiryDate || null,
        notes: notes || null,
        lines: lines.map((l) => ({
          productId:         l.productId,
          productType:       l.productType,
          description:       l.description,
          qty:               l.qty,
          unitPrice:         l.unitPrice,
          accountId:         l.accountId || null,
          taxIds:            l.taxIds,
          warehouseId:       l.warehouseId || null,
          recurringInterval: l.recurringInterval || null,
          recurringCount:    l.recurringCount || null,
          nextBillingDate:   l.nextBillingDate || null,
        })),
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat penawaran.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/sales/orders/${j.id}`)
  }

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 900 }}>
      <header style={{ marginBottom: 'var(--s-4)' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Penawaran Baru</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
          Penawaran tersimpan dalam status Draft. Konfirmasi untuk menjadi Sales Order.
        </p>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Kontak Pelanggan">
            <select style={inputStyle} value={contactId ?? ''} onChange={(e) => handleSelectContact(e.target.value)}>
              <option value="">— Pilih kontak (opsional) —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div />
          <Field label="Nama Pelanggan *">
            <input style={inputStyle} value={customerName} onChange={(e) => { setCustomerName(e.target.value); setContactId(null) }} placeholder="Nama pelanggan" />
          </Field>
          <div />
          <Field label="Tanggal *">
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Berlaku Hingga">
            <input style={inputStyle} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </Field>
        </div>

        {/* Line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Baris Penawaran
          </span>
          {lines.map((l, i) => (
            <LineCard
              key={i}
              line={l}
              products={products}
              accounts={accounts}
              taxes={taxes}
              warehouses={warehouses}
              lineCount={lines.length}
              onUpdate={(patch) => updateLine(i, patch)}
              onToggleTax={(taxId) => toggleTax(i, taxId)}
              onRemove={() => removeLine(i)}
            />
          ))}
          <button type="button" onClick={addLine}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
            + Tambah Baris
          </button>
        </div>

        <Field label="Catatan">
          <textarea style={{ ...inputStyle, height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'vertical' }} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Subtotal</span>
            <span style={{ font: '600 16px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{fmtIDR(subtotal)}</span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
        )}

        <div>
          <button type="submit" disabled={submitting}
            style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Menyimpan…' : 'Simpan Penawaran (Draft)'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Line card sub-component
// ─────────────────────────────────────────────────────────────────────────────

function LineCard({
  line, products, accounts, taxes, warehouses, lineCount,
  onUpdate, onToggleTax, onRemove,
}: {
  line:       Line
  products:   { id: string; name: string; code: string | null; salePrice: number; defaultAccountId: string | null; defaultTaxIds: string[]; uomSymbol: string | null }[]
  accounts:   { id: string; code: string; name: string }[]
  taxes:      { id: string; name: string; amount: number; amountType: string }[]
  warehouses: WarehouseOpt[]
  lineCount:  number
  onUpdate:   (patch: Partial<Line>) => void
  onToggleTax: (taxId: string) => void
  onRemove:   () => void
}) {
  const nextDates = line.recurringInterval && line.nextBillingDate
    ? nextNBillingDates(line.nextBillingDate, line.recurringInterval, 3)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-1)' }}>
      {/* Product selector */}
      {products.length > 0 && (
        <select
          style={{ ...inputStyle, color: 'var(--fg-3)', font: '12px/1 var(--font-sans)' }}
          value={line.productId ?? ''}
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value)
            if (!p) { onUpdate({ productId: null, productType: null }); return }
            onUpdate({
              productId:   p.id,
              productType: 'product',
              description: p.name,
              unitPrice:   p.salePrice,
              accountId:   p.defaultAccountId ?? line.accountId,
              taxIds:      p.defaultTaxIds.length > 0 ? p.defaultTaxIds : line.taxIds,
            })
          }}
        >
          <option value="">— Pilih produk (opsional) —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `[${p.code}] ` : ''}{p.name}{p.uomSymbol ? ` / ${p.uomSymbol}` : ''} — {new Intl.NumberFormat('id-ID').format(p.salePrice)}
            </option>
          ))}
        </select>
      )}

      {/* Main line fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 1fr 1.5fr 28px', gap: 8, alignItems: 'center' }}>
        <input style={inputStyle} placeholder="Deskripsi *" value={line.description} onChange={(e) => onUpdate({ description: e.target.value })} />
        <input style={inputStyle} type="number" min={1} value={line.qty} onChange={(e) => onUpdate({ qty: parseInt(e.target.value || '1', 10) })} title="Kuantitas" />
        <input style={inputStyle} type="number" min={0} value={line.unitPrice} onChange={(e) => onUpdate({ unitPrice: parseInt(e.target.value || '0', 10) })} placeholder="Harga (IDR)" />
        <select style={inputStyle} value={line.accountId} onChange={(e) => onUpdate({ accountId: e.target.value })}>
          <option value="">— Pilih akun —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
        </select>
        <button type="button" onClick={onRemove} disabled={lineCount === 1}
          style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: lineCount === 1 ? 'not-allowed' : 'pointer', font: '16px/1 sans-serif' }}>×</button>
      </div>

      {/* Tax toggles */}
      {taxes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Pajak:</span>
          {taxes.map((t) => {
            const on = line.taxIds.includes(t.id)
            return (
              <button key={t.id} type="button" onClick={() => onToggleTax(t.id)}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: `1px solid ${on ? 'var(--indigo)' : 'var(--border)'}`,
                  background: on ? 'var(--indigo-light, #eef0ff)' : 'transparent',
                  color: on ? 'var(--indigo)' : 'var(--fg-3)',
                  font: '500 11px/1 var(--font-sans)', cursor: 'pointer',
                }}>
                {t.name}{t.amountType === 'percent' ? ` ${t.amount / 100}%` : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Warehouse picker */}
      {warehouses.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>Gudang:</span>
          <select
            style={{ ...inputStyle, width: 'auto', minWidth: 180 }}
            value={line.warehouseId ?? ''}
            onChange={(e) => onUpdate({ warehouseId: e.target.value || null })}
          >
            <option value="">— Pilih gudang (opsional) —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recurring toggle + config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          type="button"
          onClick={() => onUpdate({ showRecurring: !line.showRecurring, recurringInterval: null, recurringCount: null, nextBillingDate: null })}
          style={{
            alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999,
            border: `1px solid ${line.showRecurring ? 'var(--indigo)' : 'var(--border)'}`,
            background: line.showRecurring ? 'var(--indigo-light, #eef0ff)' : 'transparent',
            color: line.showRecurring ? 'var(--indigo)' : 'var(--fg-3)',
            font: '500 10px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          {line.showRecurring ? '↺ Berulang (aktif)' : '+ Jadwalkan berulang'}
        </button>

        {line.showRecurring && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 8, alignItems: 'center' }}>
              <Field label="Interval">
                <select
                  style={{ ...inputStyle, width: 140 }}
                  value={line.recurringInterval ?? ''}
                  onChange={(e) => onUpdate({ recurringInterval: e.target.value || null })}
                >
                  <option value="">— Pilih —</option>
                  {RECURRING_INTERVALS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Jumlah tagihan">
                <input
                  type="number" min={1}
                  style={{ ...inputStyle, width: 72 }}
                  placeholder="∞"
                  value={line.recurringCount ?? ''}
                  onChange={(e) => onUpdate({ recurringCount: e.target.value ? parseInt(e.target.value, 10) : null })}
                />
              </Field>
              <Field label="Tagihan pertama">
                <input
                  type="date"
                  style={{ ...inputStyle, width: 150 }}
                  value={line.nextBillingDate ?? ''}
                  onChange={(e) => onUpdate({ nextBillingDate: e.target.value || null })}
                />
              </Field>
            </div>

            {/* Schedule preview */}
            {nextDates.length > 0 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>Jadwal berikutnya:</span>
                {nextDates.map((d, i) => (
                  <span key={i} style={{ font: '10px/1 var(--font-mono, monospace)', color: 'var(--fg-2)', padding: '2px 6px', background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
                    {d}
                  </span>
                ))}
                {(line.recurringCount === null || line.recurringCount > 3) && (
                  <span style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)' }}>…</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
