'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountOpt {
  id: string
  code: string
  name: string
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

interface Line {
  description: string
  quantity: number
  unitPrice: number
  accountId: string
}

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d: string, n: number) => {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function NewInvoiceForm({ revenueAccounts }: { revenueAccounts: AccountOpt[] }) {
  const router = useRouter()
  const defaultAcct = revenueAccounts[0]?.id ?? ''
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [date, setDate] = useState(today())
  const [dueDate, setDueDate] = useState(addDays(today(), 30))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { description: '', quantity: 1, unitPrice: 0, accountId: defaultAcct },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((ls) => [...ls, { description: '', quantity: 1, unitPrice: 0, accountId: defaultAcct }])
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!customerName.trim()) return setError('Nama pelanggan wajib diisi.')
    if (lines.length === 0) return setError('Tambahkan minimal satu baris.')
    for (const l of lines) {
      if (!l.description.trim()) return setError('Deskripsi baris wajib diisi.')
      if (l.quantity <= 0) return setError('Kuantitas harus lebih besar dari 0.')
      if (l.unitPrice < 0) return setError('Harga tidak boleh negatif.')
      if (!l.accountId) return setError('Pilih akun pendapatan untuk setiap baris.')
    }

    setSubmitting(true)
    const res = await fetch('/api/fin/invoices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerName, customerEmail: customerEmail || null, date, dueDate, notes: notes || null, lines }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat faktur.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/fin/invoices/${j.id}`)
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Nama Pelanggan *">
          <input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field label="Email Pelanggan">
          <input style={inputStyle} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </Field>
        <Field label="Tanggal Faktur">
          <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Jatuh Tempo">
          <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Baris Faktur
        </span>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 60px 1fr 1.5fr 28px', gap: 8, alignItems: 'center' }}>
            <input style={inputStyle} placeholder="Deskripsi" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
            <input style={inputStyle} type="number" min={1} value={l.quantity} onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value || '0', 10) })} />
            <input style={inputStyle} type="number" min={0} value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: parseInt(e.target.value || '0', 10) })} placeholder="Harga (IDR)" />
            <select style={inputStyle} value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}>
              {revenueAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
              style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: lines.length === 1 ? 'not-allowed' : 'pointer', font: '16px/1 sans-serif' }}>
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addLine}
          style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
          + Tambah Baris
        </button>
      </div>

      <Field label="Catatan">
        <textarea style={inputStyle} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--r-md)' }}>
        <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Total</span>
        <span style={{ font: '600 16px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(total)}
        </span>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        <button type="submit" disabled={submitting}
          style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
          {submitting ? 'Menyimpan…' : 'Simpan Faktur (Draf)'}
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
