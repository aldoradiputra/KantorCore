'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HdTeam } from '../../../../lib/helpdesk'

export default function NewTicketForm({ teams }: { teams: HdTeam[] }) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState('medium')
  const [source, setSource] = useState('manual')
  const [reporterName, setReporterName] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [teamId, setTeamId] = useState('')
  const [firstMsg, setFirstMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/hd/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, priority, source,
          reporterName: reporterName || null,
          reporterEmail: reporterEmail || null,
          teamId: teamId || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      const ticket = await res.json()

      // Attach first message if provided
      if (firstMsg.trim()) {
        await fetch(`/api/hd/tickets/${ticket.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: firstMsg.trim(), isInternal: false }),
        })
      }

      router.push(`/hd/tickets/${ticket.id}`)
      router.refresh()
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <Field label="Subjek">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required style={inputStyle} placeholder="Masalah yang perlu diselesaikan" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Prioritas">
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="urgent">Mendesak</option>
          </select>
        </Field>
        <Field label="Sumber">
          <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
            <option value="manual">Manual</option>
            <option value="portal">Portal</option>
            <option value="email">Email</option>
            <option value="chat">Chat</option>
            <option value="phone">Telepon</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Nama Pelapor (opsional)">
          <input value={reporterName} onChange={(e) => setReporterName(e.target.value)} style={inputStyle} placeholder="Nama pelanggan" />
        </Field>
        <Field label="Email Pelapor (opsional)">
          <input type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      {teams.length > 0 && (
        <Field label="Tim (opsional)">
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={inputStyle}>
            <option value="">— Pilih tim —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Pesan Awal (opsional)">
        <textarea
          value={firstMsg}
          onChange={(e) => setFirstMsg(e.target.value)}
          rows={4}
          style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
          placeholder="Deskripsi masalah lebih lanjut…"
        />
      </Field>

      {error && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        <button type="submit" disabled={saving} style={{
          height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)', color: 'var(--white)',
          border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)',
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Membuat…' : 'Buat Tiket'}
        </button>
        <button type="button" onClick={() => router.back()} style={{
          height: 36, padding: '0 var(--s-4)', background: 'transparent', color: 'var(--fg-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
        }}>
          Batal
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', width: '100%',
}
