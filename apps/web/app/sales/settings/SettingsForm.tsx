'use client'

import { useState } from 'react'
import { formatSoNumber } from '../../../lib/sales-settings'
import type { SalesSettings } from '../../../lib/sales-settings'

const PAYMENT_TERMS = ['COD', 'Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Net 90']

export default function SettingsForm({ initial }: { initial: SalesSettings }) {
  const [form, setForm] = useState({
    soNumberPrefix:      initial.soNumberPrefix,
    soNumberFormat:      initial.soNumberFormat,
    defaultTaxRate:      initial.defaultTaxRate,
    taxInclusive:        initial.taxInclusive,
    defaultPaymentTerms: initial.defaultPaymentTerms,
    defaultCurrency:     initial.defaultCurrency,
    quoteValidityDays:   initial.quoteValidityDays,
    autoCreateInvoice:   initial.autoCreateInvoice,
    discountApprovalPct: initial.discountApprovalPct,
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/sales/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Gagal menyimpan.')
        return
      }
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  const preview = formatSoNumber(form.soNumberFormat, form.soNumberPrefix, 1)

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Pengaturan Penjualan</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
          Default yang berlaku untuk semua dokumen penjualan baru.
        </p>
      </div>

      {/* Section: Numbering */}
      <Section title="Penomoran Dokumen">
        <Field
          label="Prefix"
          help="Awalan pada nomor SO (mis. SO, INV, JUAL)"
        >
          <input
            type="text"
            value={form.soNumberPrefix}
            onChange={(e) => setForm((f) => ({ ...f, soNumberPrefix: e.target.value.toUpperCase() }))}
            maxLength={20}
            style={inputStyle}
          />
        </Field>
        <Field
          label="Format Nomor"
          help="Token tersedia: {prefix} {year} {month} {seq:0000}"
        >
          <input
            type="text"
            value={form.soNumberFormat}
            onChange={(e) => setForm((f) => ({ ...f, soNumberFormat: e.target.value }))}
            style={inputStyle}
          />
          <div style={{ marginTop: 6, font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            Preview: <span style={{ color: 'var(--indigo)', fontFamily: 'var(--font-mono, monospace)' }}>{preview}</span>
          </div>
        </Field>
      </Section>

      {/* Section: Tax & Currency */}
      <Section title="Pajak & Mata Uang">
        <Field label="Tarif Pajak Default (%)" help="PPN Indonesia saat ini 11%">
          <input
            type="number"
            min={0} max={100}
            value={form.defaultTaxRate}
            onChange={(e) => setForm((f) => ({ ...f, defaultTaxRate: Number(e.target.value) }))}
            style={inputStyle}
          />
        </Field>
        <Field label="Harga Termasuk Pajak" help="Jika dicentang, harga di line items sudah termasuk pajak">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.taxInclusive}
              onChange={(e) => setForm((f) => ({ ...f, taxInclusive: e.target.checked }))}
            />
            <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Tax-inclusive pricing</span>
          </label>
        </Field>
        <Field label="Mata Uang">
          <select
            value={form.defaultCurrency}
            onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value }))}
            style={inputStyle}
          >
            <option value="IDR">IDR — Rupiah</option>
            <option value="USD">USD — US Dollar</option>
            <option value="SGD">SGD — Singapore Dollar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </Field>
      </Section>

      {/* Section: Payment */}
      <Section title="Pembayaran">
        <Field label="Termin Default">
          <select
            value={form.defaultPaymentTerms}
            onChange={(e) => setForm((f) => ({ ...f, defaultPaymentTerms: e.target.value }))}
            style={inputStyle}
          >
            {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Auto-Faktur Saat Dikonfirmasi" help="Jika aktif, faktur dibuat otomatis saat SO dikonfirmasi">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.autoCreateInvoice}
              onChange={(e) => setForm((f) => ({ ...f, autoCreateInvoice: e.target.checked }))}
            />
            <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Aktifkan auto-faktur</span>
          </label>
        </Field>
      </Section>

      {/* Section: Quotation */}
      <Section title="Penawaran">
        <Field label="Masa Berlaku Default (hari)">
          <input
            type="number"
            min={1} max={365}
            value={form.quoteValidityDays}
            onChange={(e) => setForm((f) => ({ ...f, quoteValidityDays: Number(e.target.value) }))}
            style={inputStyle}
          />
        </Field>
      </Section>

      {/* Section: Approvals */}
      <Section title="Persetujuan">
        <Field label="Ambang Diskon Persetujuan (%)" help="Diskon di atas nilai ini memerlukan persetujuan team leader">
          <input
            type="number"
            min={0} max={100}
            value={form.discountApprovalPct}
            onChange={(e) => setForm((f) => ({ ...f, discountApprovalPct: Number(e.target.value) }))}
            style={inputStyle}
          />
        </Field>
      </Section>

      {/* Footer */}
      <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: 'var(--s-3) 0', display: 'flex', alignItems: 'center', gap: 'var(--s-3)', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Menyimpan…' : 'Simpan Pengaturan'}
        </button>
        {savedAt && (
          <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--teal, #0F7B6C)' }}>
            ✓ Tersimpan {savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {error && (
          <span style={{ font: '12px/1 var(--font-sans)', color: '#DC2626' }}>{error}</span>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--surface)',
  boxSizing: 'border-box',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--s-5)' }}>
      <h2 style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-4)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>{children}</div>
    </section>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', marginBottom: 6 }}>{label}</label>
      {children}
      {help && <div style={{ marginTop: 4, font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{help}</div>}
    </div>
  )
}
