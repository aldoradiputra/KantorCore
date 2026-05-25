'use client'

import { useState } from 'react'

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 12px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)', font: '14px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg-1)', width: '100%', boxSizing: 'border-box',
}

export function ApplyForm({ jobPositionId, tenantId }: { jobPositionId: string; tenantId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ appNumber: string } | null>(null)

  if (done) {
    return (
      <div style={{ padding: '24px', background: '#D1FAE5', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <div style={{ font: '600 16px/1.4 var(--font-sans)', color: '#065F46', marginBottom: 8 }}>
          Lamaran berhasil dikirim!
        </div>
        <div style={{ font: '14px/1.4 var(--font-sans)', color: '#047857' }}>
          ID Lamaran: <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{done.appNumber}</strong>
        </div>
        <div style={{ font: '12px/1.6 var(--font-sans)', color: '#065F46', marginTop: 8 }}>
          Simpan ID ini untuk melacak status lamaran Anda. Tim kami akan menghubungi Anda segera.
        </div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim()) return setError('Nama dan email wajib diisi.')
    setSubmitting(true)
    try {
      const res = await fetch('/api/recruitment/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jobPositionId,
          candidateName:  name.trim(),
          candidateEmail: email.trim(),
          candidatePhone: phone.trim() || null,
          coverLetter:    coverLetter.trim() || null,
          source:         'careers_portal',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal mengirim lamaran.'); return }
      setDone({ appNumber: data.appNumber })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Nama Lengkap *">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
        </Field>
        <Field label="Email *">
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" />
        </Field>
        <Field label="Nomor Telepon">
          <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62 xxx xxxx xxxx" />
        </Field>
      </div>

      <Field label="Surat Lamaran">
        <textarea
          rows={5}
          style={{ ...inputStyle, height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical', lineHeight: '1.6' }}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder="Ceritakan mengapa Anda tertarik dengan posisi ini dan apa yang membuat Anda kandidat yang tepat…"
        />
      </Field>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: '#fee', color: '#c33', font: '13px/1.4 var(--font-sans)' }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} style={{
        padding: '12px 24px', borderRadius: 'var(--r-md)', background: 'var(--indigo)',
        color: 'white', font: '600 14px/1 var(--font-sans)', border: 'none',
        cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1,
        alignSelf: 'flex-start',
      }}>
        {submitting ? 'Mengirim…' : 'Kirim Lamaran'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</span>
      {children}
    </label>
  )
}
