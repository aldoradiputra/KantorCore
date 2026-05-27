'use client'

import { useState } from 'react'
import type { ContactFinancialProfile } from '@kantorcore/db'

interface Member { id: string; name: string | null; email: string }

const DELIVERY_METHODS = ['', 'Dikirim', 'Ambil Sendiri', 'Agen Pengiriman', 'Pos Indonesia', 'JNE', 'J&T', 'SiCepat', 'Anteraja', 'Ninja Express']
const CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'AUD', 'JPY', 'CNY', 'GBP']

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{label}</div>
      <div>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  outline: 'none', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

export default function SalesPurchaseTab({
  contactId,
  financials,
  members,
  canEdit,
}: {
  contactId: string
  financials: Partial<ContactFinancialProfile> | null
  members: Member[]
  canEdit: boolean
}) {
  const f = financials ?? {}
  const [salespersonId, setSalespersonId] = useState(f.salespersonId ?? '')
  const [paymentTermsLabel, setPaymentTermsLabel] = useState(f.paymentTermsLabel ?? '')
  const [pricelistLabel, setPricelistLabel] = useState(f.pricelistLabel ?? '')
  const [deliveryMethod, setDeliveryMethod] = useState(f.deliveryMethod ?? '')
  const [purchasePaymentTermsLabel, setPurchasePaymentTermsLabel] = useState(f.purchasePaymentTermsLabel ?? '')
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState(f.purchasePaymentMethod ?? '')
  const [receiptReminder, setReceiptReminder] = useState(f.receiptReminder ?? false)
  const [supplierCurrency, setSupplierCurrency] = useState(f.supplierCurrency ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/contacts/${contactId}/financials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salespersonId: salespersonId || null,
          paymentTermsLabel: paymentTermsLabel || null,
          pricelistLabel: pricelistLabel || null,
          deliveryMethod: deliveryMethod || null,
          purchasePaymentTermsLabel: purchasePaymentTermsLabel || null,
          purchasePaymentMethod: purchasePaymentMethod || null,
          receiptReminder,
          supplierCurrency: supplierCurrency || null,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* Sales section */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 20px' }}>
        <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 12 }}>Penjualan</div>

        <FieldRow label="Salesperson">
          <select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} disabled={!canEdit} style={selectStyle}>
            <option value="">— Tidak ada —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Termin Pembayaran">
          <input
            value={paymentTermsLabel}
            onChange={(e) => setPaymentTermsLabel(e.target.value)}
            placeholder="mis. Net 30"
            disabled={!canEdit}
            style={inputStyle}
          />
        </FieldRow>

        <FieldRow label="Daftar Harga">
          <input
            value={pricelistLabel}
            onChange={(e) => setPricelistLabel(e.target.value)}
            placeholder="mis. Harga Eceran"
            disabled={!canEdit}
            style={inputStyle}
          />
        </FieldRow>

        <FieldRow label="Metode Pengiriman">
          <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} disabled={!canEdit} style={selectStyle}>
            {DELIVERY_METHODS.map((d) => (
              <option key={d} value={d}>{d || '— Tidak ditentukan —'}</option>
            ))}
          </select>
        </FieldRow>
      </div>

      {/* Purchase section */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 20px' }}>
        <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 12 }}>Pembelian</div>

        <FieldRow label="Termin Pembayaran">
          <input
            value={purchasePaymentTermsLabel}
            onChange={(e) => setPurchasePaymentTermsLabel(e.target.value)}
            placeholder="mis. Net 30"
            disabled={!canEdit}
            style={inputStyle}
          />
        </FieldRow>

        <FieldRow label="Metode Pembayaran">
          <input
            value={purchasePaymentMethod}
            onChange={(e) => setPurchasePaymentMethod(e.target.value)}
            placeholder="mis. Transfer Bank, Cek"
            disabled={!canEdit}
            style={inputStyle}
          />
        </FieldRow>

        <FieldRow label="Pengingat Tanda Terima">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canEdit ? 'pointer' : 'default' }}>
            <input
              type="checkbox"
              checked={receiptReminder}
              onChange={(e) => setReceiptReminder(e.target.checked)}
              disabled={!canEdit}
            />
            <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Kirim pengingat tanda terima</span>
          </label>
        </FieldRow>

        <FieldRow label="Mata Uang Pemasok">
          <select value={supplierCurrency} onChange={(e) => setSupplierCurrency(e.target.value)} disabled={!canEdit} style={selectStyle}>
            <option value="">— Default (IDR) —</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FieldRow>
      </div>

      {/* Save button — full width */}
      {canEdit && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          {saved && <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--teal)', alignSelf: 'center' }}>Tersimpan ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 18px', font: '500 13px/1 var(--font-sans)', color: 'var(--white)', background: 'var(--indigo)', border: 'none', borderRadius: 'var(--r-sm)', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      )}
    </div>
  )
}
