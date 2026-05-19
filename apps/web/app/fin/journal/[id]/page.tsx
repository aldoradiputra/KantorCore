import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getJournalEntry, formatIDR } from '../../../../lib/finance'
import { FinShell } from '../../FinShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getJournalEntry(ctx.tenant.id, id)
  if (!data) notFound()
  const { entry, lines } = data

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="journal"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/fin/journal" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Jurnal</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span>{entry.entryNumber}</span>
        </div>

        <header>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>{entry.entryNumber}</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', margin: '6px 0 0' }}>{entry.description}</p>
          <p style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            {entry.date} · status {entry.status}
            {entry.referenceType && ` · referensi ${entry.referenceType}`}
          </p>
        </header>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr><Th>Akun</Th><Th>Deskripsi</Th><Th align="right">Debit</Th><Th align="right">Kredit</Th></tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td><span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-3)' }}>{l.accountCode}</span> {l.accountName}</Td>
                  <Td>{l.description ?? '—'}</Td>
                  <Td align="right" mono>{l.debit > 0 ? formatIDR(l.debit) : '—'}</Td>
                  <Td align="right" mono>{l.credit > 0 ? formatIDR(l.credit) : '—'}</Td>
                </tr>
              ))}
              <tr style={{ background: 'var(--bg)' }}>
                <Td colSpan={2} align="right"><b>Total</b></Td>
                <Td align="right" mono><b>{formatIDR(totalDebit)}</b></Td>
                <Td align="right" mono><b>{formatIDR(totalCredit)}</b></Td>
              </tr>
            </tbody>
          </table>
        </div>

        {totalDebit !== totalCredit && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>
            ⚠ Debit dan kredit tidak seimbang (selisih {formatIDR(Math.abs(totalDebit - totalCredit))}).
          </div>
        )}
      </div>
    </FinShell>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono, colSpan }: { children: React.ReactNode; align?: 'right'; mono?: boolean; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}>{children}</td>
}
