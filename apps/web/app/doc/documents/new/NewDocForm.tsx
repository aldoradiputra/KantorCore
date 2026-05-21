'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocType } from '../../../../lib/documents'

interface ContactOpt { id: string; name: string }

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

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'contract',  label: 'Kontrak' },
  { value: 'nda',       label: 'NDA' },
  { value: 'mou',       label: 'MoU' },
  { value: 'agreement', label: 'Perjanjian' },
  { value: 'po',        label: 'Purchase Order' },
  { value: 'invoice',   label: 'Faktur' },
  { value: 'permit',    label: 'Izin' },
  { value: 'other',     label: 'Lainnya' },
]

export function NewDocForm({ contacts }: { contacts: ContactOpt[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<DocType>('contract')
  const [contactId, setContactId] = useState('')
  const [partyName, setPartyName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [value, setValue] = useState(0)
  const [fileUrl, setFileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleContactSelect(id: string) {
    const c = contacts.find((x) => x.id === id)
    setContactId(id)
    setPartyName(c?.name ?? '')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Judul dokumen wajib diisi.')
    setSubmitting(true)
    const res = await fetch('/api/doc/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        type,
        contactId: contactId || null,
        partyName: partyName || null,
        startDate: startDate || null,
        expiryDate: expiryDate || null,
        value,
        fileUrl: fileUrl || null,
        notes: notes || null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal membuat dokumen.')
      setSubmitting(false)
      return
    }
    const j = await res.json()
    router.push(`/doc/documents/${j.id}`)
  }

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 680 }}>
      <header style={{ marginBottom: 'var(--s-4)' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Dokumen Baru</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>Dokumen tersimpan dalam status Draft. Aktifkan setelah ditandatangani.</p>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <Field label="Judul Dokumen *">
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Kontrak Kerja Sama PT Maju 2026" />
        </Field>

        <Field label="Tipe Dokumen">
          <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as DocType)}>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        <Field label="Kontak">
          <select style={inputStyle} value={contactId} onChange={(e) => handleContactSelect(e.target.value)}>
            <option value="">— Pilih kontak (opsional) —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        {!contactId && (
          <Field label="Nama Pihak (manual)">
            <input style={inputStyle} value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Nama perusahaan atau individu" />
          </Field>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Field label="Tanggal Mulai">
            <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Tanggal Berakhir">
            <input style={inputStyle} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Nilai Kontrak (IDR)">
          <input style={inputStyle} type="number" min={0} value={value} onChange={(e) => setValue(parseInt(e.target.value || '0', 10))} />
        </Field>

        <Field label="URL / Link Dokumen">
          <input style={inputStyle} type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." />
        </Field>

        <Field label="Catatan">
          <textarea style={{ ...inputStyle, height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'vertical' }} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
        )}

        <div>
          <button type="submit" disabled={submitting}
            style={{ padding: '10px 18px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Menyimpan…' : 'Simpan Dokumen'}
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
