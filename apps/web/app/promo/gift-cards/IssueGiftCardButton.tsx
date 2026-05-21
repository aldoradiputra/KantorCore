'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function IssueGiftCardButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [validTo, setValidTo] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/promo/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountMinor: Math.round(Number(amount) * 100),
          validTo: validTo || null,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      setOpen(false)
      router.refresh()
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)',
          color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
          font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
        }}
      >
        + Terbitkan Gift Card
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', width: 420, padding: 'var(--s-5)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Terbitkan Gift Card</span>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', font: '16px/1 var(--font-sans)', color: 'var(--fg-3)', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Nominal (Rp)</label>
                <input type="number" min={1000} required value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} placeholder="100000" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Berlaku Hingga (opsional)</label>
                <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Catatan (opsional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} placeholder="Hadiah ulang tahun" />
              </div>

              {error && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}

              <div style={{ display: 'flex', gap: 'var(--s-2)', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setOpen(false)} style={{ height: 32, padding: '0 var(--s-3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ height: 32, padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Memproses…' : 'Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', width: '100%',
}
