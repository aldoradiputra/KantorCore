'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DealStage } from '../../../../lib/crm'

interface ContactOpt {
  id: string; name: string
  email: string | null; phone: string | null
  addrKota: string | null; addrProvinsi: string | null
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

const today = () => new Date().toISOString().slice(0, 10)

const STAGES: { value: DealStage; label: string }[] = [
  { value: 'lead',        label: 'Prospek' },
  { value: 'qualified',   label: 'Terverifikasi' },
  { value: 'proposal',    label: 'Penawaran' },
  { value: 'negotiation', label: 'Negosiasi' },
]

export function NewDealForm({ contacts }: { contacts: ContactOpt[] }) {
  const router = useRouter()
  const [contactId, setContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactLocation, setContactLocation] = useState('')
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<DealStage>('lead')
  const [expectedValue, setExpectedValue] = useState(0)
  const [expectedClose, setExpectedClose] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleContactSelect(id: string) {
    const c = contacts.find((x) => x.id === id)
    setContactId(id)
    setContactName(c?.name ?? '')
    setContactEmail(c?.email ?? '')
    setContactPhone(c?.phone ?? '')
    setContactLocation([c?.addrKota, c?.addrProvinsi].filter(Boolean).join(', '))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Judul deal wajib diisi.')
    setSubmitting(true)
    const res = await fetch('/api/crm/deals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        stage,
        contactId: contactId || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        expectedValue,
        expectedClose: expectedClose || null,
        notes: notes || null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat deal.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/crm/deals/${j.id}`)
  }

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 640 }}>
      <header style={{ marginBottom: 'var(--s-4)' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Deal Baru</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>Tambahkan peluang penjualan ke pipeline CRM.</p>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <Field label="Judul Deal *">
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Proyek ERP PT Maju" />
        </Field>

        <Field label="Stage Awal">
          <select style={inputStyle} value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>

        <Field label="Kontak / Pelanggan">
          <select style={inputStyle} value={contactId} onChange={(e) => handleContactSelect(e.target.value)}>
            <option value="">— Pilih kontak (opsional) —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        {!contactId && (
          <Field label="Nama Kontak (manual)">
            <input style={inputStyle} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nama perusahaan atau kontak" />
          </Field>
        )}

        {/* Auto-fill strip */}
        {contactId && (contactEmail || contactPhone || contactLocation) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '8px 12px', background: 'rgba(59,79,196,0.04)', border: '1px solid rgba(59,79,196,0.15)', borderRadius: 'var(--r-sm)', font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            {contactEmail && <span>✉ {contactEmail}</span>}
            {contactPhone && <span>☎ {contactPhone}</span>}
            {contactLocation && <span>📍 {contactLocation}</span>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Nilai Estimasi (IDR)">
            <input style={inputStyle} type="number" min={0} value={expectedValue} onChange={(e) => setExpectedValue(parseInt(e.target.value || '0', 10))} />
          </Field>
          <Field label="Target Tutup">
            <input style={inputStyle} type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
          </Field>
        </div>

        <Field label="Catatan">
          <textarea style={{ ...inputStyle, height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'vertical' }} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
        )}

        <div>
          <button type="submit" disabled={submitting}
            style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Menyimpan…' : 'Buat Deal'}
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
