import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import {
  findDueRecurringLines, markBillingCycleComplete,
} from '../../../../../lib/sales-advanced'
import { getDb } from '../../../../../lib/db'
import { salesOrders, soLines } from '@kantorcore/db'
import { createInvoice } from '../../../../../lib/finance'
import { eq } from 'drizzle-orm'

/**
 * Trigger recurring billing for all lines due today.
 * Called by the platform cron (or admin manually). One invoice per SO per run.
 */
export async function POST() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const due = await findDueRecurringLines(ctx.tenant.id)
  if (due.length === 0) return NextResponse.json({ billed: 0, invoices: 0 })

  // Group by SO
  const bySO = new Map<string, typeof due>()
  for (const l of due) {
    if (!bySO.has(l.soId)) bySO.set(l.soId, [])
    bySO.get(l.soId)!.push(l)
  }

  const db = getDb()
  let invoicesCreated = 0
  let linesBilled = 0

  for (const [soId, lines] of bySO) {
    const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, soId)).limit(1)
    if (!so) continue

    const billable = lines
      .filter((l) => l.accountId)
      .map((l) => ({
        description: `${l.description} — ${l.recurringInterval}`,
        quantity:    l.qty,
        unitPrice:   l.unitPrice,
        accountId:   l.accountId!,
        taxIds:      l.taxIds,
      }))

    if (billable.length === 0) continue

    await createInvoice({
      tenantId:     ctx.tenant.id,
      userId:       ctx.session.user.id,
      contactId:    so.contactId ?? null,
      customerName: so.customerName,
      date:         new Date().toISOString().slice(0, 10),
      dueDate:      new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      notes:        `Recurring billing untuk ${so.soNumber}`,
      lines:        billable,
    })
    invoicesCreated++

    for (const l of lines) {
      await markBillingCycleComplete(ctx.tenant.id, l.id)
      linesBilled++
    }
  }

  return NextResponse.json({ billed: linesBilled, invoices: invoicesCreated })
}
