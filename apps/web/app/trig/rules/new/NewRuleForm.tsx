'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EVENTS = [
  { value: 'invoice.confirmed', label: 'Faktur Dikonfirmasi' },
  { value: 'invoice.paid', label: 'Faktur Dibayar' },
  { value: 'bill.confirmed', label: 'Tagihan Dikonfirmasi' },
  { value: 'bill.paid', label: 'Tagihan Dibayar' },
  { value: 'po.confirmed', label: 'PO Dikonfirmasi' },
  { value: 'po.received', label: 'PO Diterima' },
  { value: 'so.confirmed', label: 'SO Dikonfirmasi' },
  { value: 'so.done', label: 'SO Selesai' },
  { value: 'deal.won', label: 'Deal Menang' },
  { value: 'deal.lost', label: 'Deal Kalah' },
  { value: 'deal.stage_changed', label: 'Stage Deal Berubah' },
  { value: 'contact.created', label: 'Kontak Dibuat' },
  { value: 'employee.created', label: 'Karyawan Dibuat' },
  { value: 'document.expiring_soon', label: 'Dokumen Segera Kadaluarsa' },
  { value: 'import.completed', label: 'Import Selesai' },
]

const TEMPLATE_HINTS: Record<string, string> = {
  'invoice.confirmed': 'Faktur {{invoiceNumber}} untuk {{customerName}} sebesar {{total}} dikonfirmasi.',
  'invoice.paid': 'Faktur {{invoiceNumber}} telah dibayar.',
  'deal.won': 'Deal {{title}} senilai {{expectedValue}} MENANG!',
  'deal.lost': 'Deal {{title}} kalah.',
  'po.confirmed': 'PO {{poNumber}} ke vendor dikonfirmasi.',
  'import.completed': 'Import {{entity}} selesai: {{imported}} berhasil, {{failed}} gagal.',
}

export default function NewRuleForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [event, setEvent] = useState('invoice.confirmed')
  const [action, setAction] = useState<'chat_message' | 'webhook'>('chat_message')
  const [channelSlug, setChannelSlug] = useState('general')
  const [template, setTemplate] = useState(TEMPLATE_HINTS['invoice.confirmed'] ?? '')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onEventChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setEvent(val)
    if (TEMPLATE_HINTS[val]) setTemplate(TEMPLATE_HINTS[val]!)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const config = action === 'chat_message'
      ? { channel_slug: channelSlug, template }
      : { url: webhookUrl, secret: webhookSecret || undefined }

    try {
      const res = await fetch('/api/trig/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, event, action, config }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Gagal menyimpan rule.')
        return
      }
      router.push('/trig/rules')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 600, overflowY: 'auto' }}>
      <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 'var(--s-5)' }}>
        Tambah Trigger Rule
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <Field label="Nama Rule">
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Notif Faktur Lunas ke #finance"
            required style={inputStyle}
          />
        </Field>

        <Field label="Deskripsi (opsional)">
          <input
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Penjelasan singkat"
            style={inputStyle}
          />
        </Field>

        <Field label="Event">
          <select value={event} onChange={onEventChange} style={inputStyle}>
            {EVENTS.map((ev) => (
              <option key={ev.value} value={ev.value}>{ev.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Aksi">
          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            {(['chat_message', 'webhook'] as const).map((a) => (
              <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} />
                {a === 'chat_message' ? 'Pesan Chat' : 'Webhook'}
              </label>
            ))}
          </div>
        </Field>

        {action === 'chat_message' ? (
          <>
            <Field label="Kanal Chat">
              <input
                value={channelSlug} onChange={(e) => setChannelSlug(e.target.value)}
                placeholder="general"
                required style={inputStyle}
              />
              <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>Slug kanal tujuan (tanpa #)</div>
            </Field>
            <Field label="Template Pesan">
              <textarea
                value={template} onChange={(e) => setTemplate(e.target.value)}
                rows={3} required
                placeholder="Gunakan {{variabel}} dari payload event"
                style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
              />
              <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
                Gunakan {'{{variabel}}'} — misal {'{{invoiceNumber}}'}, {'{{total}}'}, {'{{title}}'}
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label="URL Webhook">
              <input
                value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/..."
                required style={inputStyle}
              />
            </Field>
            <Field label="Secret (opsional)">
              <input
                value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Dikirim sebagai X-Webhook-Secret header"
                style={inputStyle}
              />
            </Field>
          </>
        )}

        {error && (
          <div style={{ padding: 'var(--s-3)', background: 'var(--danger-light,#fef2f2)', border: '1px solid var(--danger,#c33)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--danger,#c33)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
          <button
            type="submit" disabled={saving}
            style={{
              height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)',
              color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
              font: '600 13px/1 var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Menyimpan…' : 'Simpan Rule'}
          </button>
          <button
            type="button" onClick={() => router.back()}
            style={{
              height: 36, padding: '0 var(--s-4)', background: 'transparent',
              color: 'var(--fg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
            }}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--surface)',
  width: '100%',
}
