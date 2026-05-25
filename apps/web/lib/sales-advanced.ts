import 'server-only'
import { and, eq, lte, isNotNull, isNull } from 'drizzle-orm'
import {
  salesOrders, soLines, fiscalPositions, fiscalPositionTaxMaps,
  commissionRules, commissionEntries,
  type FiscalPosition, type CommissionRule, type CommissionEntry,
} from '@kantorcore/db'
import { withTenant } from './db'
import { createInvoice } from './finance'

export type { FiscalPosition, CommissionRule, CommissionEntry }

// ─────────────────────────────────────────────────────────────────────────────
// Fiscal Position resolution
// ─────────────────────────────────────────────────────────────────────────────

export interface FiscalContext {
  countryCode?: string | null
  hasVat?:      boolean
}

/** Pick the best-matching auto-apply fiscal position for a customer context. */
export async function resolveFiscalPosition(
  tenantId: string,
  ctx: FiscalContext,
): Promise<FiscalPosition | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(fiscalPositions)
      .where(and(
        eq(fiscalPositions.tenantId, tenantId),
        eq(fiscalPositions.autoApply, true),
        eq(fiscalPositions.isActive, true),
      ))

    // More specific (country + vat) wins over country-only wins over generic
    const score = (fp: FiscalPosition): number => {
      let s = 0
      if (fp.countryCode && fp.countryCode === ctx.countryCode) s += 2
      if (fp.vatRequired !== null && fp.vatRequired === ctx.hasVat) s += 1
      return s
    }

    const scored = rows.map((fp) => ({ fp, score: score(fp) })).filter((x) => x.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.fp ?? null
  })
}

/** Apply fiscal position tax mapping to a source tax id list. */
export async function mapTaxes(
  tenantId:           string,
  fiscalPositionId:   string,
  sourceTaxIds:       string[],
): Promise<string[]> {
  if (sourceTaxIds.length === 0) return []
  return withTenant(tenantId, async (tx) => {
    const maps = await tx
      .select()
      .from(fiscalPositionTaxMaps)
      .where(eq(fiscalPositionTaxMaps.fiscalPositionId, fiscalPositionId))

    const mapBySource = new Map(maps.map((m) => [m.sourceTaxId, m.targetTaxId]))
    return sourceTaxIds
      .map((id) => (mapBySource.has(id) ? mapBySource.get(id) : id))
      .filter((id): id is string => id !== null && id !== undefined)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Down Payment invoice
// ─────────────────────────────────────────────────────────────────────────────

export async function createDownPaymentInvoice(input: {
  tenantId: string
  userId:   string
  soId:     string
  /** Either pct (1-100) or fixed amount in IDR (mutually exclusive) */
  pct?:     number
  amount?:  number
}): Promise<{ ok: true; invoiceId: string; amount: number } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const [so] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, input.soId), eq(salesOrders.tenantId, input.tenantId)))
      .limit(1)
    if (!so) return { ok: false as const, error: 'SO tidak ditemukan.' }
    if (so.dpInvoiceId) return { ok: false as const, error: 'Down payment sudah dibuat untuk SO ini.' }

    // Determine DP amount
    let dpAmount = 0
    if (input.pct !== undefined) {
      if (input.pct <= 0 || input.pct >= 100) return { ok: false as const, error: 'Persentase DP harus antara 1–99.' }
      dpAmount = Math.round(so.totalAmount * input.pct / 100)
    } else if (input.amount !== undefined) {
      if (input.amount <= 0 || input.amount >= so.totalAmount) {
        return { ok: false as const, error: 'Nominal DP harus lebih besar dari 0 dan kurang dari total SO.' }
      }
      dpAmount = input.amount
    } else {
      return { ok: false as const, error: 'Tentukan persentase atau nominal DP.' }
    }

    // Need at least one line with revenue account to invoice against
    const lines = await tx.select().from(soLines).where(eq(soLines.soId, input.soId))
    const accountedLines = lines.filter((l) => l.accountId)
    if (accountedLines.length === 0) {
      return { ok: false as const, error: 'Tidak ada baris dengan akun pendapatan untuk membebani DP.' }
    }

    const invoice = await createInvoice({
      tenantId:     input.tenantId,
      userId:       input.userId,
      contactId:    so.contactId ?? null,
      customerName: so.customerName,
      date:         new Date().toISOString().slice(0, 10),
      dueDate:      new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      notes:        `Down Payment ${so.soNumber}` + (input.pct ? ` (${input.pct}%)` : ''),
      lines:        [{
        description: `Down Payment — ${so.soNumber}`,
        quantity:    1,
        unitPrice:   dpAmount,
        accountId:   accountedLines[0]!.accountId!,
        taxIds:      [],
      }],
    })

    await tx
      .update(salesOrders)
      .set({
        dpInvoiceId:       invoice.id,
        downPaymentPct:    input.pct ?? null,
        downPaymentAmount: dpAmount,
        updatedAt:         new Date(),
      })
      .where(eq(salesOrders.id, input.soId))

    return { ok: true as const, invoiceId: invoice.id, amount: dpAmount }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Three-Way Match
// ─────────────────────────────────────────────────────────────────────────────

export interface ThreeWayMatchRow {
  lineId:       string
  description:  string
  qty:          number
  deliveredQty: number
  invoicedQty:  number
  deliveryGap:  number   // qty - deliveredQty
  invoiceGap:   number   // deliveredQty - invoicedQty
  status:       'matched' | 'partial' | 'over' | 'pending'
}

export async function getThreeWayMatch(tenantId: string, soId: string): Promise<ThreeWayMatchRow[]> {
  return withTenant(tenantId, async (tx) => {
    const lines = await tx
      .select()
      .from(soLines)
      .where(eq(soLines.soId, soId))

    return lines.map((l) => {
      const deliveryGap = l.qty - l.deliveredQty
      const invoiceGap  = l.deliveredQty - l.invoicedQty
      let status: ThreeWayMatchRow['status']
      if (l.invoicedQty > l.deliveredQty)                       status = 'over'
      else if (l.qty === l.deliveredQty && l.deliveredQty === l.invoicedQty) status = 'matched'
      else if (l.deliveredQty > 0 || l.invoicedQty > 0)         status = 'partial'
      else                                                       status = 'pending'

      return {
        lineId:       l.id,
        description:  l.description,
        qty:          l.qty,
        deliveredQty: l.deliveredQty,
        invoicedQty:  l.invoicedQty,
        deliveryGap,
        invoiceGap,
        status,
      }
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-warehouse line state machine
// ─────────────────────────────────────────────────────────────────────────────

export type LineFulfillmentState = 'awaiting_warehouse' | 'ready_to_pick' | 'partial' | 'fulfilled' | 'over'

export function lineFulfillmentState(line: { qty: number; deliveredQty: number; warehouseId: string | null }): LineFulfillmentState {
  if (!line.warehouseId)                  return 'awaiting_warehouse'
  if (line.deliveredQty === 0)            return 'ready_to_pick'
  if (line.deliveredQty < line.qty)       return 'partial'
  if (line.deliveredQty === line.qty)     return 'fulfilled'
  return 'over'
}

/** Group lines by warehouse — returns picking lists. */
export async function getPickingLists(tenantId: string, soId: string): Promise<Array<{
  warehouseId: string | null
  lines:       (typeof soLines.$inferSelect)[]
}>> {
  return withTenant(tenantId, async (tx) => {
    const lines = await tx
      .select()
      .from(soLines)
      .where(eq(soLines.soId, soId))

    const grouped = new Map<string | null, typeof lines>()
    for (const l of lines) {
      const k = l.warehouseId
      if (!grouped.has(k)) grouped.set(k, [])
      grouped.get(k)!.push(l)
    }
    return [...grouped.entries()].map(([warehouseId, lines]) => ({ warehouseId, lines }))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Recurring billing
// ─────────────────────────────────────────────────────────────────────────────

/** Advance next_billing_date by the line's recurring interval. */
export function advanceBillingDate(currentDate: Date, interval: string): Date {
  const d = new Date(currentDate)
  switch (interval) {
    case 'monthly':   d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

/**
 * Find all recurring lines that are due for billing today and have remaining cycles.
 * Caller should invoke createInvoice per line and then call markBillingCycleComplete.
 */
export async function findDueRecurringLines(tenantId: string): Promise<(typeof soLines.$inferSelect)[]> {
  const today = new Date().toISOString().slice(0, 10)
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(soLines)
      .where(and(
        eq(soLines.tenantId, tenantId),
        isNotNull(soLines.recurringInterval),
        isNotNull(soLines.nextBillingDate),
        lte(soLines.nextBillingDate, today),
      ))
  )
}

export async function markBillingCycleComplete(
  tenantId: string,
  lineId:   string,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const [line] = await tx.select().from(soLines).where(eq(soLines.id, lineId)).limit(1)
    if (!line || !line.recurringInterval || !line.nextBillingDate) return

    const next = advanceBillingDate(new Date(line.nextBillingDate), line.recurringInterval)
    const remainingCount = line.recurringCount !== null ? line.recurringCount - 1 : null

    if (remainingCount !== null && remainingCount <= 0) {
      // Series complete — clear recurring schedule
      await tx
        .update(soLines)
        .set({ nextBillingDate: null, recurringCount: 0 })
        .where(eq(soLines.id, lineId))
    } else {
      await tx
        .update(soLines)
        .set({
          nextBillingDate: next.toISOString().slice(0, 10),
          recurringCount:  remainingCount,
        })
        .where(eq(soLines.id, lineId))
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Commission engine
// ─────────────────────────────────────────────────────────────────────────────

/** Compute and persist commissions for a given SO upon trigger event. */
export async function awardCommissionsForSO(input: {
  tenantId: string
  soId:     string
  event:    'invoice_validated' | 'invoice_paid'
}): Promise<{ awarded: number; total: number }> {
  return withTenant(input.tenantId, async (tx) => {
    const [so] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, input.soId), eq(salesOrders.tenantId, input.tenantId)))
      .limit(1)
    if (!so || !so.assignedTo) return { awarded: 0, total: 0 }

    const rules = await tx
      .select()
      .from(commissionRules)
      .where(and(
        eq(commissionRules.tenantId, input.tenantId),
        eq(commissionRules.isActive, true),
        eq(commissionRules.triggerEvent, input.event),
      ))
      .orderBy(commissionRules.priority)

    // Filter rules that apply to this SO's user or team
    const matching = rules.filter((r) => {
      if (r.userId && r.userId !== so.assignedTo) return false
      if (r.teamId && r.teamId !== so.teamId)     return false
      return true
    })

    if (matching.length === 0) return { awarded: 0, total: 0 }

    // Use the highest-priority matching rule
    const rule = matching[0]!
    const basisAmount = rule.basis === 'margin'
      ? Math.max(0, so.totalAmount - so.discountAmount)  // simplified margin
      : so.totalAmount
    const commissionAmount = Math.round(basisAmount * Number(rule.ratePct) / 100)

    await tx.insert(commissionEntries).values({
      tenantId:         input.tenantId,
      ruleId:           rule.id,
      soId:             input.soId,
      userId:           so.assignedTo,
      basisAmount,
      commissionAmount,
    })

    return { awarded: 1, total: commissionAmount }
  })
}
