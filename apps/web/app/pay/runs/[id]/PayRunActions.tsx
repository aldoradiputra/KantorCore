'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const btn = (bg: string, color = 'white', outline = false): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 'var(--r-md)',
  background: outline ? 'transparent' : bg,
  color: outline ? bg : color,
  border: outline ? `1px solid ${bg}` : 'none',
  font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
})

export function PayRunActions({
  payRunId,
  status,
  journalEntryId,
  paymentJournalEntryId,
}: {
  payRunId: string
  status: string
  journalEntryId: string | null
  paymentJournalEntryId: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(action: string) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/pay/runs/${payRunId}/${action}`, { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Aksi gagal.')
      setBusy(false)
      return
    }
    router.refresh()
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* DRAFT: Hitung Otomatis + Batalkan */}
        {status === 'draft' && <>
          <button onClick={() => call('calculate')} disabled={busy} style={btn('var(--indigo)')}>
            Hitung Otomatis (BPJS + PPh 21)
          </button>
          <button onClick={() => call('cancel')} disabled={busy} style={btn('var(--fg-2)', 'var(--fg-2)', true)}>
            Batalkan
          </button>
        </>}

        {/* CALCULATED: Setujui + Hitung Ulang */}
        {status === 'calculated' && <>
          <button onClick={() => call('approve')} disabled={busy} style={btn('var(--indigo)')}>
            Setujui Pay Run
          </button>
          <button onClick={() => call('recalculate')} disabled={busy} style={btn('var(--amber)', 'white')}>
            Hitung Ulang
          </button>
        </>}

        {/* APPROVED: Posting Jurnal */}
        {status === 'approved' && <>
          <button onClick={() => call('post')} disabled={busy} style={btn('var(--teal)')}>
            Posting ke Jurnal
          </button>
          <button onClick={() => call('recalculate')} disabled={busy} style={btn('var(--fg-3)', 'var(--fg-3)', true)}>
            Batalkan Persetujuan
          </button>
        </>}

        {/* POSTED: Catat Pembayaran */}
        {status === 'posted' && (
          <button onClick={() => call('pay')} disabled={busy} style={btn('var(--teal)')}>
            Catat Pembayaran
          </button>
        )}

        {/* Export links — shown once calculated or beyond */}
        {['calculated','approved','posted','paid'].includes(status) && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <a href={`/api/pay/runs/${payRunId}/export?type=djp`} style={{ ...btn('var(--indigo)', 'var(--indigo)', true), fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>
              ↓ DJP / e-Bupot
            </a>
            <a href={`/api/pay/runs/${payRunId}/export?type=bpjs-ket`} style={{ ...btn('var(--teal)', 'var(--teal)', true), fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>
              ↓ SIPP (BPJSKet)
            </a>
            <a href={`/api/pay/runs/${payRunId}/export?type=bpjs-kes`} style={{ ...btn('var(--teal)', 'var(--teal)', true), fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>
              ↓ EDABU (BPJSKes)
            </a>
          </div>
        )}

        {journalEntryId && (
          <Link href={`/fin/journal/${journalEntryId}`}
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--indigo)', border: '1px solid var(--indigo)', font: '600 13px/1 var(--font-sans)', textDecoration: 'none' }}>
            Jurnal Posting →
          </Link>
        )}
        {paymentJournalEntryId && (
          <Link href={`/fin/journal/${paymentJournalEntryId}`}
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--teal)', border: '1px solid var(--teal)', font: '600 13px/1 var(--font-sans)', textDecoration: 'none' }}>
            Jurnal Pembayaran →
          </Link>
        )}
      </div>

      {/* State machine hint */}
      <div style={{ font: '11px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
        {status === 'draft' && 'Draf → Klik "Hitung Otomatis" untuk menjalankan kalkulasi BPJS & PPh 21 per karyawan.'}
        {status === 'calculated' && 'Terhitung → Periksa hasil kalkulasi, lalu "Setujui" untuk mengunci payslip.'}
        {status === 'approved' && 'Disetujui → Payslip terkunci. Klik "Posting ke Jurnal" untuk mencatat ke GL.'}
        {status === 'posted' && 'Diposting → Jurnal GL sudah tercatat. Klik "Catat Pembayaran" setelah transfer gaji dilakukan.'}
        {status === 'paid' && 'Dibayar — Pay run selesai. Gunakan Retroactive Adjustment untuk koreksi di periode berikutnya.'}
        {status === 'cancelled' && 'Dibatalkan.'}
      </div>

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}
    </div>
  )
}
