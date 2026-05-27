'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountOpt { id: string; code: string; name: string }
interface TaxOpt { id: string; name: string; amount: number; amountType: 'percent' | 'fixed' }
interface ContactOpt {
  id: string; name: string
  email: string | null; phone: string | null; npwp: string | null
  addrLine1: string | null; addrLine2: string | null
  addrKelurahan: string | null; addrKecamatan: string | null
  addrKota: string | null; addrProvinsi: string | null; addrKodePos: string | null
  paymentTermsLabel: string | null
}
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

interface Line { productId: string | null; productType: string | null; description: string; qty: number; unitPrice: number; accountId: string; taxIds: string[] }

const today = () => new Date().toISOString().slice(0, 10)
const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export function NewPOForm({ accounts, taxes, contacts, products }: {
  accounts: AccountOpt[]
  taxes: TaxOpt[]
  contacts: ContactOpt[]
  products: ProductOpt[]
}) {
  const router = useRouter()
  const defaultAcct = accounts[0]?.id ?? ''
  const [contactId, setContactId] = useState<string | null>(null)
  const [vendorName, setVendorName] = useState('')
  const [vendorEmail, setVendorEmail] = useState('')
  const [vendorPhone, setVendorPhone] = useState('')
  const [vendorNpwp, setVendorNpwp] = useState('')
  const [vendorAddr, setVendorAddr] = useState('')
  const [paymentTermsLabel, setPaymentTermsLabel] = useState('')
  const [date, setDate] = useState(today())
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ productId: null, productType: null, description: '', qty: 1, unitPrice: 0, accountId: defaultAcct, taxIds: [] }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function toggleTax(i: number, taxId: string) {
    setLines((ls) => ls.map((l, idx) => {
      if (idx !== i) return l
      return l.taxIds.includes(taxId) ? { ...l, taxIds: l.taxIds.filter((id) => id !== taxId) } : { ...l, taxIds: [...l.taxIds, taxId] }
    }))
  }
  function addLine() {
    setLines((ls) => [...ls, { productId: null, productType: null, description: '', qty: 1, unitPrice: 0, accountId: defaultAcct, taxIds: [] }])
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i))
  }

  function handleSelectContact(id: string) {
    const c = contacts.find((x) => x.id === id)
    if (!c) { setContactId(null); return }
    setContactId(c.id)
    setVendorName(c.name)
    setVendorEmail(c.email ?? '')
    setVendorPhone(c.phone ?? '')
    setVendorNpwp(c.npwp ?? '')
    setPaymentTermsLabel(c.paymentTermsLabel ?? '')
    const parts = [c.addrLine1, c.addrLine2, c.addrKelurahan ? `Kel. ${c.addrKelurahan}` : null, c.addrKecamatan ? `Kec. ${c.addrKecamatan}` : null, c.addrKota, c.addrKodePos, c.addrProvinsi].filter(Boolean)
    setVendorAddr(parts.join(', '))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!vendorName.trim()) return setError('Nama vendor wajib diisi.')
    for (const l of lines) {
      if (!l.description.trim()) return setError('Deskripsi baris wajib diisi.')
      if (l.qty <= 0) return setError('Kuantitas harus lebih besar dari 0.')
      if (l.unitPrice < 0) return setError('Harga tidak boleh negatif.')
    }
    setSubmitting(true)
    const res = await fetch('/api/proc/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contactId,
        vendorName,
        vendorEmail: vendorEmail || null,
        vendorPhone: vendorPhone || null,
        vendorNpwp: vendorNpwp || null,
        vendorAddress: vendorAddr || null,
        paymentTermsLabel: paymentTermsLabel || null,
        date,
        expectedDate: expectedDate || null,
        notes: notes || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          productType: l.productType,
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice,
          accountId: l.accountId || null,
          taxIds: l.taxIds,
        })),
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat PO.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/proc/orders/${j.id}`)
  }

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 900 }}>
      <header style={{ marginBottom: 'var(--s-4)' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>PO Baru</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>Pesanan pembelian akan tersimpan dalam status Draft.</p>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Kontak Vendor">
            <select style={inputStyle} value={contactId ?? ''} onChange={(e) => handleSelectContact(e.target.value)}>
              <option value="">— Pilih kontak (opsional) —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div />
          <Field label="Nama Vendor *">
            <input style={inputStyle} value={vendorName} onChange={(e) => { setVendorName(e.target.value); setContactId(null) }} placeholder="Nama vendor" />
          </Field>
          <Field label="Termin Pembayaran">
            <input style={inputStyle} value={paymentTermsLabel} onChange={(e) => setPaymentTermsLabel(e.target.value)} placeholder="mis. Net 30" />
          </Field>
          <Field label="Tanggal PO *">
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Tanggal Ekspektasi">
            <input style={inputStyle} type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </Field>
        </div>

        {/* Auto-fill strip */}
        {contactId && (vendorEmail || vendorPhone || vendorNpwp || vendorAddr) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '8px 12px', background: 'rgba(59,79,196,0.04)', border: '1px solid rgba(59,79,196,0.15)', borderRadius: 'var(--r-sm)', font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            {vendorEmail && <span>✉ {vendorEmail}</span>}
            {vendorPhone && <span>☎ {vendorPhone}</span>}
            {vendorNpwp && <span>NPWP {vendorNpwp}</span>}
            {vendorAddr && <span>📍 {vendorAddr}</span>}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Baris PO</span>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-1)' }}>
              {products.length > 0 && (
                <select
                  style={{ ...inputStyle, color: 'var(--fg-3)', font: '12px/1 var(--font-sans)' }}
                  value={l.productId ?? ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value)
                    if (!p) {
                      updateLine(i, { productId: null, productType: null })
                      return
                    }
                    updateLine(i, {
                      productId: p.id,
                      productType: 'product',
                      description: p.name,
                      unitPrice: p.costPrice,
                      accountId: p.defaultAccountId ?? l.accountId,
                      taxIds: p.defaultTaxIds.length > 0 ? p.defaultTaxIds : l.taxIds,
                    })
                  }}
                >
                  <option value="">— Pilih produk (opsional) —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `[${p.code}] ` : ''}{p.name} — {new Intl.NumberFormat('id-ID').format(p.costPrice)}
                    </option>
                  ))}
                </select>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 1fr 1.5fr 28px', gap: 8, alignItems: 'center' }}>
                <input style={inputStyle} placeholder="Deskripsi *" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                <input style={inputStyle} type="number" min={1} value={l.qty} onChange={(e) => updateLine(i, { qty: parseInt(e.target.value || '1', 10) })} title="Kuantitas" />
                <input style={inputStyle} type="number" min={0} value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: parseInt(e.target.value || '0', 10) })} placeholder="Harga (IDR)" />
                <select style={inputStyle} value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}>
                  <option value="">— Pilih akun —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
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
                        {t.name}{t.amountType === 'percent' ? ` ${t.amount / 100}%` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
            {submitting ? 'Menyimpan…' : 'Simpan PO (Draf)'}
          </button>
        </div>
      </form>
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
