import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../lib/db'
import { salesOrders, soLines } from '@kantorcore/db'
import SignaturePanel from './SignaturePanel'

function formatIDR(v: number) {
  return v === 0 ? '—' : 'Rp ' + v.toLocaleString('id-ID')
}

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = getDb()

  const [so] = await db
    .select()
    .from(salesOrders)
    .where(eq(salesOrders.signatureToken, token))
    .limit(1)

  if (!so) notFound()

  const lines = await db.select().from(soLines).where(eq(soLines.soId, so.id))
  const alreadySigned = so.signedAt !== null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 720, width: '100%', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s-4)' }}>
          <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Penawaran
          </div>
          <h1 style={{ font: '600 24px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            {so.soNumber}
          </h1>
          <div style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', marginTop: 8 }}>
            Untuk: <strong>{so.customerName}</strong>
          </div>
          {so.customerReference && (
            <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              Ref Pelanggan: {so.customerReference}
            </div>
          )}
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left',  padding: '8px 0', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Item</th>
              <th style={{ textAlign: 'right', padding: '8px 0', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 0', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Harga</th>
              <th style={{ textAlign: 'right', padding: '8px 0', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0', color: 'var(--fg-1)' }}>
                  {l.description}
                  {l.recurringInterval && (
                    <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'var(--indigo-light)', color: 'var(--indigo)', fontSize: 10, fontWeight: 600 }}>
                      {l.recurringInterval}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{l.qty}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(l.unitPrice)}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--fg-1)', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {so.discountAmount > 0 && (
              <tr><td colSpan={3} style={{ padding: '6px 0', textAlign: 'right', color: 'var(--fg-3)' }}>Diskon</td><td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>− {formatIDR(so.discountAmount)}</td></tr>
            )}
            <tr><td colSpan={3} style={{ padding: '6px 0', textAlign: 'right', color: 'var(--fg-3)' }}>Pajak</td><td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{formatIDR(so.taxAmount)}</td></tr>
            <tr style={{ borderTop: '2px solid var(--border)' }}>
              <td colSpan={3} style={{ padding: '10px 0', textAlign: 'right', font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Total</td>
              <td style={{ padding: '10px 0', textAlign: 'right', font: '600 16px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{formatIDR(so.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {so.notes && (
          <div style={{ padding: 'var(--s-3)', background: 'var(--bg)', borderRadius: 'var(--r-md)', font: '12px/1.6 var(--font-sans)', color: 'var(--fg-2)' }}>
            {so.notes}
          </div>
        )}

        {/* Signature panel */}
        {alreadySigned ? (
          <div style={{ padding: 'var(--s-4)', background: '#D1FAE5', borderRadius: 'var(--r-md)', textAlign: 'center', color: '#065F46', font: '14px/1.4 var(--font-sans)' }}>
            ✓ Sudah ditandatangani oleh <strong>{so.signedByName}</strong> pada {so.signedAt?.toLocaleString('id-ID')}
          </div>
        ) : (
          <SignaturePanel soId={so.id} token={token} />
        )}
      </div>
    </div>
  )
}
