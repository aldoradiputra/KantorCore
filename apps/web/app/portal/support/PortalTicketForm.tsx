'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalTicketForm() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      setDone(true)
      router.refresh()
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  if (done) {
    return (
      <div style={{ padding: 'var(--s-4)', background: 'var(--teal-light)', border: '1px solid var(--success)', borderRadius: 'var(--r-md)', font: '13px/1.5 var(--font-sans)', color: 'var(--success)' }}>
        Tiket Anda telah dikirim. Tim kami akan segera merespons.
        <button type="button" onClick={() => { setDone(false); setSubject(''); setBody('') }} style={{ marginLeft: 12, background: 'none', border: 'none', font: '13px/1 var(--font-sans)', color: 'var(--success)', textDecoration: 'underline', cursor: 'pointer' }}>
          Kirim tiket lain
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{
      padding: 'var(--s-5)', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)',
    }}>
      <h3 style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
        Buat Permintaan Baru
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Subjek</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required style={inputStyle} placeholder="Ringkasan singkat masalah Anda" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Deskripsi</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }} placeholder="Jelaskan masalah Anda secara detail…" />
      </div>

      {error && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}

      <button type="submit" disabled={saving} style={{
        height: 40, padding: '0 var(--s-5)', background: 'var(--indigo)', color: 'var(--white)',
        border: 'none', borderRadius: 'var(--r-sm)', font: '600 14px/1 var(--font-sans)',
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start',
      }}>
        {saving ? 'Mengirim…' : 'Kirim Permintaan'}
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)',
}
