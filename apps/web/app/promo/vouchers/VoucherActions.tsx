'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VoucherActions() {
  const router = useRouter()
  const [showBatch, setShowBatch] = useState(false)
  const [showSingle, setShowSingle] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
      <button
        type="button"
        onClick={() => { setShowSingle(true); setShowBatch(false) }}
        style={{
          height: 36, padding: '0 var(--s-4)', background: 'transparent',
          color: 'var(--fg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
        }}
      >
        + Voucher
      </button>
      <button
        type="button"
        onClick={() => { setShowBatch(true); setShowSingle(false) }}
        style={{
          height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)',
          color: 'var(--white)', border: 'none',
          borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
        }}
      >
        Generate Batch
      </button>

      {showSingle && (
        <SingleVoucherModal onClose={() => { setShowSingle(false); router.refresh() }} />
      )}
      {showBatch && (
        <BatchVoucherModal onClose={() => { setShowBatch(false); router.refresh() }} />
      )}
    </div>
  )
}

function SingleVoucherModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [pct, setPct] = useState('')
  const [amt, setAmt] = useState('')
  const [maxUses, setMaxUses] = useState('1')
  const [validTo, setValidTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/promo/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, voucherType: 'code',
          discountOverridePct: pct ? Number(pct) : null,
          discountOverrideAmt: amt ? Math.round(Number(amt) * 100) : null,
          maxUses: maxUses ? Number(maxUses) : null,
          validTo: validTo || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      onClose()
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  return (
    <Modal title="Buat Voucher" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <MiniField label="Kode">
          <input value={code} onChange={(e) => setCode(e.target.value)} required style={inputStyle} placeholder="DISKON20" />
        </MiniField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <MiniField label="Diskon % (opsional)"><input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} style={inputStyle} /></MiniField>
          <MiniField label="Nominal Rp (opsional)"><input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} style={inputStyle} /></MiniField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <MiniField label="Maks Pemakaian"><input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} style={inputStyle} /></MiniField>
          <MiniField label="Berlaku Hingga"><input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={inputStyle} /></MiniField>
        </div>
        {error && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}
        <ModalActions saving={saving} onClose={onClose} label="Simpan" />
      </form>
    </Modal>
  )
}

function BatchVoucherModal({ onClose }: { onClose: () => void }) {
  const [count, setCount] = useState('10')
  const [pct, setPct] = useState('')
  const [amt, setAmt] = useState('')
  const [maxUses, setMaxUses] = useState('1')
  const [validTo, setValidTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<number | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/promo/vouchers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: Number(count),
          discountOverridePct: pct ? Number(pct) : null,
          discountOverrideAmt: amt ? Math.round(Number(amt) * 100) : null,
          maxUses: maxUses ? Number(maxUses) : null,
          validTo: validTo || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      const d = await res.json()
      setResult(d.count)
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  if (result !== null) {
    return (
      <Modal title="Batch Dibuat" onClose={onClose}>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)' }}>
          {result} kode voucher berhasil dibuat.
        </p>
        <button type="button" onClick={onClose} style={{ height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer' }}>
          Tutup
        </button>
      </Modal>
    )
  }

  return (
    <Modal title="Generate Batch Voucher" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <MiniField label="Jumlah Kode" hint="Maks 500">
          <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(e.target.value)} required style={inputStyle} />
        </MiniField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <MiniField label="Diskon % (opsional)"><input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} style={inputStyle} /></MiniField>
          <MiniField label="Nominal Rp (opsional)"><input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} style={inputStyle} /></MiniField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <MiniField label="Maks Pemakaian/Kode"><input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} style={inputStyle} /></MiniField>
          <MiniField label="Berlaku Hingga"><input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={inputStyle} /></MiniField>
        </div>
        {error && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}
        <ModalActions saving={saving} onClose={onClose} label="Generate" />
      </form>
    </Modal>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', width: 480, maxWidth: '95vw', padding: 'var(--s-5)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{title}</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', font: '16px/1 var(--font-sans)', color: 'var(--fg-3)', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MiniField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{label}</label>
      {children}
      {hint && <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</div>}
    </div>
  )
}

function ModalActions({ saving, onClose, label }: { saving: boolean; onClose: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--s-2)', justifyContent: 'flex-end' }}>
      <button type="button" onClick={onClose} style={{ height: 32, padding: '0 var(--s-3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
        Batal
      </button>
      <button type="submit" disabled={saving} style={{ height: 32, padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Menyimpan…' : label}
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', width: '100%',
}
