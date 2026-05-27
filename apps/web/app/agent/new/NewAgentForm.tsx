'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Recommended)' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Most capable)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' },
]

export default function NewAgentForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || pending) return
    setPending(true)
    setError(null)
    const res = await fetch('/api/agent/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, model, systemPrompt }),
    })
    if (res.ok) {
      const data = (await res.json()) as { agent: { id: string } }
      router.push(`/agent/${data.agent.id}`)
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal membuat agen.' }))
    setError(data.error ?? 'Gagal membuat agen.')
    setPending(false)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--s-7) var(--s-5)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 'var(--s-6)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 'var(--s-2)' }}>Agen baru</h2>
        <p style={{ marginTop: 0, marginBottom: 'var(--s-5)', color: 'var(--fg-3)', font: '400 13px/1.5 var(--font-sans)' }}>
          Agen bisa memanggil tool sesuai Mandat yang Anda berikan. Tanpa mandat, agen tidak bisa
          melakukan apa pun.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                background: 'rgba(179, 90, 0, 0.08)',
                border: '1px solid rgba(179, 90, 0, 0.2)',
                borderRadius: 'var(--r-sm)',
                font: '500 12px/1.4 var(--font-sans)',
                color: 'var(--amber)',
              }}
            >
              {error}
            </div>
          )}

          <Field label="Nama agen">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="mis. Asisten Proyek, Bot Laporan"
              style={inputStyle}
            />
          </Field>

          <Field label="Deskripsi (opsional)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Model">
            <select value={model} onChange={(e) => setModel(e.target.value)} style={inputStyle}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="System prompt (opsional)">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              placeholder="Instruksi dasar untuk agen ini…"
              style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
            />
          </Field>

          <button
            type="submit"
            disabled={pending || !name.trim()}
            style={{
              height: 38,
              background: pending || !name.trim() ? 'var(--border)' : 'var(--indigo)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              font: '600 13px/1 var(--font-sans)',
              cursor: pending || !name.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Memproses…' : 'Buat agen'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  background: 'var(--bg)',
  font: '400 14px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  outline: 'none',
  width: '100%',
}
