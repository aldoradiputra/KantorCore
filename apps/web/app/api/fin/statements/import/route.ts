import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { parseFile } from '../../../../../lib/import/parser'
import { createStatement } from '../../../../../lib/finance-recon'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const journalId = form.get('journalId') as string | null
  const startingBalance = parseFloat((form.get('startingBalance') as string) ?? '0')
  const endingBalance   = parseFloat((form.get('endingBalance')   as string) ?? '0')
  const dateFrom = form.get('dateFrom') as string | null
  const dateTo   = form.get('dateTo')   as string | null

  if (!file || !journalId || !dateFrom || !dateTo) {
    return NextResponse.json({ error: 'file, journalId, dateFrom, dateTo required' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseFile(buffer, file.name, {})

  // Expect columns: date, amount, reference, notes (flexible header names)
  const dateKey   = parsed.headers.find((h) => /date|tanggal/i.test(h)) ?? parsed.headers[0]!
  const amountKey = parsed.headers.find((h) => /amount|jumlah|nominal/i.test(h)) ?? parsed.headers[1]!
  const refKey    = parsed.headers.find((h) => /ref|reference|keterangan/i.test(h)) ?? null
  const notesKey  = parsed.headers.find((h) => /note|notes|catatan/i.test(h)) ?? null

  const records = parsed.rows.map((r) => ({
    date:      r[dateKey] ?? '',
    amount:    parseFloat(r[amountKey]?.replace(/,/g, '') ?? '0'),
    reference: refKey ? r[refKey] : undefined,
    notes:     notesKey ? r[notesKey] : undefined,
  })).filter((r) => r.date && !isNaN(r.amount))

  const result = await createStatement({
    tenantId: ctx.tenant.id,
    journalId,
    startingBalance,
    endingBalance,
    dateFrom,
    dateTo,
    userId: session.user.id,
    records,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ statementId: result.statementId, rowCount: records.length })
}
