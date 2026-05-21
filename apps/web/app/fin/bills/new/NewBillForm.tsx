'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountOpt { id: string; code: string; name: string }
interface TaxOpt { id: string; name: string; amount: number; amountType: 'percent' | 'fixed'; isWithholding: boolean }
interface ContactOpt { id: string; name: string; email: string | null; phone: string | null }

interface ProductOpt {
  id: string; name: string; code: string | null
  costPrice: number; defaultAccountId: string | null
  defaultTaxIds: string[]; uomSymbol: string | null
}

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

interface Line { description: string; quantity: number; unitPrice: number; accountId: string; taxIds: string[] }

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d: string, n: number) => {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10)
}
const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

function lineTaxAmount(subtotal: number, applied: TaxOpt[]): { regular: number; withholding: number; byTax: { id: string; name: string; amount: number; isWithholding: boolean }[] } {
  const byTax = applied.map((t) => ({
    id: t.id,
    name: t.name,
    amount: t.amountType === 'percent' ? Math.round(subtotal * (t.amount / 10000)) : t.amount,
    isWithholding: t.isWithholding,
  }))
  const regular = byTax.filter((t) => !t.isWithholding).reduce((s, t) => s + t.amount, 0)
  const withholding = byTax.filter((t) => t.isWithholding).reduce((s, t) => s + t.amount, 0)
  return { regular, withholding, byTax }
}

function ContactPicker({
  contacts,
  selectedId,
  onSelect,
  onClear,
}: {
  contacts: ContactOpt[]
  selectedId: string | null
  onSelect: (c: ContactOpt) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = contacts.find((c) => c.id === selectedId) ?? null

  const filtered = query.length > 0
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : contacts

  if (selected) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 34,
        padding: '0 10px',
        border: '1px solid var(--indigo)',
        borderRadius: 'var(--r-sm)',
        background: 'var(--indigo-light, #eef0ff)',
        boxSizing: 'border-box',
      }}>
        <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--indigo)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.name}{selected.email ? ` · ${selected.email}` : ''}
        </span>
        <button
          type="button"
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: 'var(--indigo)', cursor: 'pointer', font: '16px/1 sans-serif', padding: 0, flexShrink: 0 }}
          title="Hapus kontak"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        style={inputStyle}
        placeholder={contacts.length === 0 ? 'Belum ada kontak vendor' : 'Cari kontak…'}
        value={query}
        disabled={contacts.length === 0}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-sm)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 240,
          overflowY: 'auto',
          marginTop: 2,
        }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => {
                onSelect(c)
                setQuery('')
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{c.name}</div>
              {(c.email || c.phone) && (
                <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                  {c.email ?? c.phone}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function NewBillForm({ expenseAccounts, taxes, contacts, products }: {
  expenseAccounts: AccountOpt[]
  taxes: TaxOpt[]
  contacts: ContactOpt[]
  products: ProductOpt[]
}) {
  const router = useRouter()
  const defaultAcct = expenseAccounts[0]?.id ?? ''
  const firstRegularTax = taxes.find((t) => !t.isWithholding)
  const defaultTaxIds = firstRegularTax ? [firstRegularTax.id] : []
  const [contactId, setContactId] = useState<string | null>(null)
  const [vendorName, setVendorName] = useState('')
  const [vendorRef, setVendorRef] = useState('')
  const [date, setDate] = useState(today())
  const [dueDate, setDueDate] = useState(addDays(today(), 30))
  const [notes, setNotes] = useState('')
  const [displayTaxInline, setDisplayTaxInline] = useState(false)
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: 1, unitPrice: 0, accountId: defaultAcct, taxIds: defaultTaxIds }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSelectContact(c: ContactOpt) {
    setContactId(c.id)
    setVendorName(c.name)
  }

  function handleClearContact() {
    setContactId(null)
  }

  const computed = lines.map((l) => {
    const subtotal = l.quantity * l.unitPrice
    const applied = taxes.filter((t) => l.taxIds.includes(t.id))
    const { regular, withholding, byTax } = lineTaxAmount(subtotal, applied)
    return { base: subtotal, regular, withholding, total: subtotal + regular, byTax }
  })
  const subtotal = computed.reduce((s, c) => s + c.base, 0)
  const totalRegular = computed.reduce((s, c) => s + c.regular, 0)
  const totalWithholding = computed.reduce((s, c) => s + c.withholding, 0)
  const grandTotal = subtotal + totalRegular
  const netSettlement = grandTotal - totalWithholding
  const taxSummary = new Map<string, { name: string; amount: number; isWithholding: boolean }>()
  for (const c of computed) for (const t of c.byTax) {
    const cur = taxSummary.get(t.id)
    if (cur) cur.amount += t.amount
    else taxSummary.set(t.id, { name: t.name, amount: t.amount, isWithholding: t.isWithholding })
  }

  function updateLine(i: number, patch: Partial<Line>) { setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l)) }
  function toggleTax(i: number, taxId: string) {
    setLines((ls) => ls.map((l, idx) => {
      if (idx !== i) return l
      return l.taxIds.includes(taxId) ? { ...l, taxIds: l.taxIds.filter((id) => id !== taxId) } : { ...l, taxIds: [...l.taxIds, taxId] }
    }))
  }
  function addLine() { setLines((ls) => [...ls, { description: '', quantity: 1, unitPrice: 0, accountId: defaultAcct, taxIds: defaultTaxIds }]) }
  function removeLine(i: number) { setLines((ls) => ls.filter((_, idx) => idx !== i)) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!vendorName.trim()) return setError('Nama vendor wajib diisi.')
    for (const l of lines) {
      if (!l.description.trim()) return setError('Deskripsi baris wajib diisi.')
      if (l.quantity <= 0) return setError('Kuantitas harus lebih besar dari 0.')
      if (l.unitPrice < 0) return setError('Harga tidak boleh negatif.')
      if (!l.accountId) return setError('Pilih akun untuk setiap baris.')
    }
    setSubmitting(true)
    const res = await fetch('/api/fin/bills', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vendorName,
        vendorRef: vendorRef || null,
        contactId,
        date,
        dueDate,
        notes: notes || null,
        displayTaxInline,
        lines,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat tagihan.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/fin/bills/${j.id}`)
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Kontak Vendor">
          <ContactPicker
            contacts={contacts}
            selectedId={contactId}
            onSelect={handleSelectContact}
            onClear={handleClearContact}
          />
        </Field>
        <div />
        <Field label="Nama Vendor *">
          <input style={inputStyle} value={vendorName} onChange={(e) => { setVendorName(e.target.value); setContactId(null) }} />
        </Field>
        <Field label="No. Referensi Vendor">
          <input style={inputStyle} value={vendorRef} onChange={(e) => setVendorRef(e.target.value)} />
        </Field>
        <Field label="Tanggal"><input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Jatuh Tempo"><input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Baris Tagihan</span>
        {lines.map((l, i) => {
          const c = computed[i]!
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-1)' }}>
              {products.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <select
                    style={{ ...inputStyle, color: 'var(--fg-3)', font: '12px/1 var(--font-sans)' }}
                    value=""
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value)
                      if (!p) return
                      updateLine(i, {
                        description: p.name,
                        unitPrice: p.costPrice,
                        accountId: p.defaultAccountId ?? l.accountId,
                        taxIds: p.defaultTaxIds.length > 0 ? p.defaultTaxIds : l.taxIds,
                      })
                    }}
                  >
                    <option value="">— Pilih produk untuk isi otomatis —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ''}{p.name}{p.uomSymbol ? ` / ${p.uomSymbol}` : ''} — {new Intl.NumberFormat('id-ID').format(p.costPrice)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 1fr 1.5fr 28px', gap: 8, alignItems: 'center' }}>
                <input style={inputStyle} placeholder="Deskripsi" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                <input style={inputStyle} type="number" min={1} value={l.quantity} onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value || '0', 10) })} />
                <input style={inputStyle} type="number" min={0} value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: parseInt(e.target.value || '0', 10) })} placeholder="Harga (IDR)" />
                <select style={inputStyle} value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}>
                  {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
                  style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: lines.length === 1 ? 'not-allowed' : 'pointer', font: '16px/1 sans-serif' }}>×</button>
              </div>
              {taxes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Pajak:</span>
                  {taxes.map((t) => {
                    const on = l.taxIds.includes(t.id)
                    return (
                      <button key={t.id} type="button" onClick={() => toggleTax(i, t.id)}
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
                  {(c.regular > 0 || c.withholding > 0) && (
                    <span style={{ marginLeft: 'auto', font: '11px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
                      Subtotal {fmtIDR(c.base)}
                      {c.regular > 0 && <> · Pajak {fmtIDR(c.regular)}</>}
                      {c.withholding > 0 && <> · PWH −{fmtIDR(c.withholding)}</>}
                      {' '}· Total {fmtIDR(c.total)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <button type="button" onClick={addLine}
          style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
          + Tambah Baris
        </button>
      </div>

      <Field label="Catatan"><textarea style={inputStyle} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
        <input type="checkbox" checked={displayTaxInline} onChange={(e) => setDisplayTaxInline(e.target.checked)} />
        Tampilkan pajak per-baris pada detail tagihan (default: ringkasan di bawah subtotal)
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--r-md)' }}>
        <Row label="Subtotal" value={fmtIDR(subtotal)} muted />
        {Array.from(taxSummary.values()).filter((t) => !t.isWithholding).map((t) => (
          <Row key={t.name} label={t.name} value={fmtIDR(t.amount)} muted />
        ))}
        <Row label="Total Tagihan" value={fmtIDR(grandTotal)} />
        {Array.from(taxSummary.values()).filter((t) => t.isWithholding).map((t) => (
          <Row key={t.name} label={`${t.name} (potong)`} value={`−${fmtIDR(t.amount)}`} muted />
        ))}
        {totalWithholding > 0 && <Row label="Dibayar ke vendor (net)" value={fmtIDR(netSettlement)} />}
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}

      <div>
        <button type="submit" disabled={submitting}
          style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
          {submitting ? 'Menyimpan…' : 'Simpan Tagihan (Draf)'}
        </button>
      </div>
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

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ font: `${muted ? '500' : '600'} ${muted ? 12 : 13}px/1 var(--font-sans)`, color: muted ? 'var(--fg-3)' : 'var(--fg-2)' }}>{label}</span>
      <span style={{ font: `${muted ? '500' : '600'} ${muted ? 13 : 16}px/1 var(--font-mono, monospace)`, color: muted ? 'var(--fg-2)' : 'var(--fg-1)' }}>{value}</span>
    </div>
  )
}
