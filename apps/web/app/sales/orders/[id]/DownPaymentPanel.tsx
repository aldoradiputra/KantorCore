'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  soId:        string
  totalAmount: number
  dpInvoiceId: string | null
}

const fmtIDR = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(n)

export function DownPaymentPanel({ soId, totalAmount, dpInvoiceId }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'pct' | 'fixed'>('pct')
  const [pct, setPct] = useState(30)
  const [amount, setAmount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (dpInvoiceId) {
    return (
      <div style={{ padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Down Payment</div>
          <div style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Faktur DP sudah dibuat</div>
        </div>
        <Link href={`/fin/invoices/${dpInvoiceId}`} style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
          Lihat Faktur →
        </Link>
      </div>
    )
  }

  const preview = mode === 'pct' ? Math.round(totalAmount * pct / 100) : amount

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const body = mode === 'pct' ? { pct } : { amount }
      const res = await fetch(`/api/sales/orders/${soId}/down-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal membuat faktur DP.'); return }
      router.push(`/fin/invoices/${data.invoiceId}`)
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 34, padding: '0 10px', border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
    background: 'var(--bg-1)', boxSizing: 'border-box',
  }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 999, font: '500 11px/1 var(--font-sans)',
    border: `1px solid ${active ? 'var(--indigo)' : 'var(--border)'}`,
    background: active ? 'var(--indigo-light, #eef0ff)' : 'transparent',
    color: active ? 'var(--indigo)' : 'var(--fg-3)', cursor: 'pointer',
  })

  return (
    <div style={{ padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Down Payment</div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" style={tabBtn(mode === 'pct')} onClick={() => setMode('pct')}>Persentase</button>
        <button type="button" style={tabBtn(mode === 'fixed')} onClick={() => setMode('fixed')}>Nominal Tetap</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {mode === 'pct' ? (
          <>
            <input
              type="number" min={1} max={99} value={pct}
              onChange={(e) => setPct(parseInt(e.target.value || '0', 10))}
              style={{ ...inputStyle, width: 72 }}
            />
            <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>%</span>
            <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', marginLeft: 4 }}>
              = {fmtIDR(preview)}
            </span>
          </>
        ) : (
          <>
            <input
              type="number" min={1} value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))}
              style={{ ...inputStyle, width: 160 }}
              placeholder="Nominal DP"
            />
          </>
        )}
      </div>

      {error && (
        <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--danger, #c33)' }}>{error}</div>
      )}

      <button
        onClick={submit}
        disabled={busy || (mode === 'pct' ? pct <= 0 : amount <= 0)}
        style={{
          alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--r-md)',
          background: 'var(--indigo)', color: 'white', font: '600 12px/1 var(--font-sans)',
          border: 'none', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Membuat…' : 'Buat Faktur Down Payment'}
      </button>
    </div>
  )
}
