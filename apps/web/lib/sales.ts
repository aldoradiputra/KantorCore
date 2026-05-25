import 'server-only'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  salesOrders, soLines, products, contacts, deals,
  type SalesOrder, type SoLine, type SoStatus,
} from '@kantorcore/db'
import { withTenant } from './db'
import { createInvoice } from './finance'
import { getSalesSettings, formatSoNumber } from './sales-settings'

export type { SalesOrder, SoLine, SoStatus }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SoLineInput {
  productId?: string | null
  productType?: string | null
  description: string
  qty: number
  unitPrice: number
  accountId?: string | null
  taxIds?: string[]
}

export interface SoWithLines {
  so: SalesOrder
  lines: (SoLine & { productName: string | null; productCode: string | null })[]
  customerContact: { id: string; name: string; email: string | null } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextSoNumber(tx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.tenantId, tenantId),
        sql`EXTRACT(YEAR FROM created_at) = ${year}`,
      ),
    )
  const settings = await getSalesSettings(tenantId)
  return formatSoNumber(settings.soNumberFormat, settings.soNumberPrefix, count + 1)
}

/** Calculate line totals using settings (tax rate + tax-inclusive flag). */
function computeTotals(
  lines: { qty: number; unitPrice: number }[],
  taxRate: number,
  taxInclusive: boolean,
  discountAmount = 0,
): { subtotal: number; tax: number; total: number } {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  if (taxInclusive) {
    const tax = Math.round(afterDiscount - afterDiscount / (1 + taxRate / 100))
    return { subtotal, tax, total: afterDiscount }
  }
  const tax = Math.round(afterDiscount * taxRate / 100)
  return { subtotal, tax, total: afterDiscount + tax }
}

// ── List & Get ────────────────────────────────────────────────────────────────

export async function listSOs(
  tenantId: string,
  opts: { status?: SoStatus; teamId?: string; assignedTo?: string; limit?: number; offset?: number } = {},
): Promise<SalesOrder[]> {
  return withTenant(tenantId, (tx) => {
    const conditions = [eq(salesOrders.tenantId, tenantId), isNull(salesOrders.deletedAt)]
    if (opts.status)     conditions.push(eq(salesOrders.status, opts.status))
    if (opts.teamId)     conditions.push(eq(salesOrders.teamId, opts.teamId))
    if (opts.assignedTo) conditions.push(eq(salesOrders.assignedTo, opts.assignedTo))
    return tx
      .select()
      .from(salesOrders)
      .where(and(...conditions)!)
      .orderBy(desc(salesOrders.createdAt))
      .limit(opts.limit ?? 100)
      .offset(opts.offset ?? 0)
  })
}

export async function getSO(tenantId: string, id: string): Promise<SoWithLines | null> {
  return withTenant(tenantId, async (tx) => {
    const [so] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1)

    if (!so) return null

    const lines = await tx
      .select({
        line: soLines,
        productName: products.name,
        productCode: products.code,
      })
      .from(soLines)
      .leftJoin(products, eq(soLines.productId, products.id))
      .where(eq(soLines.soId, id))
      .orderBy(asc(soLines.id))

    let customerContact: SoWithLines['customerContact'] = null
    if (so.contactId) {
      const [c] = await tx
        .select({ id: contacts.id, name: contacts.name, email: contacts.email })
        .from(contacts)
        .where(eq(contacts.id, so.contactId))
        .limit(1)
      if (c) customerContact = c
    }

    return {
      so,
      lines: lines.map((r) => ({
        ...r.line,
        productName: r.productName ?? null,
        productCode: r.productCode ?? null,
      })),
      customerContact,
    }
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createSO(input: {
  tenantId: string
  userId: string
  contactId?: string | null
  customerName: string
  date: string
  expiryDate?: string | null
  notes?: string | null
  lines: SoLineInput[]
  teamId?: string | null
  assignedTo?: string | null
  dealId?: string | null
  discountAmount?: number
  paymentTerms?: string | null
}): Promise<{ ok: true; so: SalesOrder } | { ok: false; error: string }> {
  if (!input.customerName.trim()) return { ok: false, error: 'Nama pelanggan wajib diisi.' }
  if (input.lines.length === 0) return { ok: false, error: 'Tambahkan minimal satu baris.' }

  const settings = await getSalesSettings(input.tenantId)
  const { subtotal, tax, total } = computeTotals(
    input.lines,
    settings.defaultTaxRate,
    settings.taxInclusive,
    input.discountAmount ?? 0,
  )

  // Compute payment due date from terms
  let paymentDueDate: string | null = null
  const terms = input.paymentTerms ?? settings.defaultPaymentTerms
  const netMatch = terms.match(/Net\s*(\d+)/i)
  if (netMatch) {
    const days = Number(netMatch[1])
    const due = new Date(input.date)
    due.setDate(due.getDate() + days)
    paymentDueDate = due.toISOString().slice(0, 10)
  }

  // Expiry from settings if not provided
  const expiryDate = input.expiryDate ?? (() => {
    const d = new Date(input.date)
    d.setDate(d.getDate() + settings.quoteValidityDays)
    return d.toISOString().slice(0, 10)
  })()

  return withTenant(input.tenantId, async (tx) => {
    const soNumber = await nextSoNumber(tx, input.tenantId)

    const [so] = await tx
      .insert(salesOrders)
      .values({
        tenantId:       input.tenantId,
        soNumber,
        status:         'quotation',
        contactId:      input.contactId ?? null,
        customerName:   input.customerName.trim(),
        date:           input.date,
        expiryDate,
        notes:          input.notes?.trim() ?? null,
        teamId:         input.teamId ?? null,
        assignedTo:     input.assignedTo ?? input.userId,
        dealId:         input.dealId ?? null,
        subtotalAmount: subtotal,
        discountAmount: input.discountAmount ?? 0,
        taxAmount:      tax,
        totalAmount:    total,
        paymentTerms:   terms,
        paymentDueDate,
        createdBy:      input.userId,
      })
      .returning()

    await tx.insert(soLines).values(
      input.lines.map((l) => ({
        tenantId:    input.tenantId,
        soId:        so!.id,
        productId:   l.productId ?? null,
        productType: l.productType ?? null,
        description: l.description.trim(),
        qty:         l.qty,
        unitPrice:   l.unitPrice,
        accountId:   l.accountId ?? null,
        taxIds:      l.taxIds ?? [],
        deliveredQty: 0,
      })),
    )

    return { ok: true as const, so: so! }
  })
}

// ── CRM → SO conversion ───────────────────────────────────────────────────────

export async function createSOFromDeal(input: {
  tenantId: string
  userId: string
  dealId: string
  expectedClose?: string | null
}): Promise<{ ok: true; so: SalesOrder } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const [deal] = await tx
      .select()
      .from(deals)
      .where(and(eq(deals.id, input.dealId), eq(deals.tenantId, input.tenantId)))
      .limit(1)

    if (!deal) return { ok: false as const, error: 'Deal tidak ditemukan.' }

    // Check if SO already exists for this deal
    const [existing] = await tx
      .select({ id: salesOrders.id, soNumber: salesOrders.soNumber })
      .from(salesOrders)
      .where(and(eq(salesOrders.dealId, input.dealId), isNull(salesOrders.deletedAt)))
      .limit(1)
    if (existing) {
      return { ok: false as const, error: `SO ${existing.soNumber} sudah dibuat untuk deal ini.` }
    }

    const customerName = deal.contactName ?? 'Pelanggan'
    const today = new Date().toISOString().slice(0, 10)

    const result = await createSO({
      tenantId:     input.tenantId,
      userId:       input.userId,
      contactId:    deal.contactId,
      customerName,
      date:         today,
      teamId:       deal.teamId,
      assignedTo:   deal.assignedTo ?? input.userId,
      dealId:       deal.id,
      notes:        `Dibuat dari deal CRM: ${deal.title}`,
      lines:        [{
        description: deal.title,
        qty:         1,
        unitPrice:   deal.expectedValue,
      }],
    })

    if (result.ok) {
      // Write back-reference so deal detail page can link to SO
      await tx
        .update(deals)
        .set({ soId: result.so.id, updatedAt: new Date() })
        .where(eq(deals.id, deal.id))
    }

    return result
  })
}

// ── Confirm ───────────────────────────────────────────────────────────────────

export async function confirmSO(
  tenantId: string,
  id: string,
): Promise<{ ok: true; so: SalesOrder } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [so] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1)

    if (!so) return { ok: false as const, error: 'SO tidak ditemukan.' }
    if (so.status !== 'quotation') return { ok: false as const, error: 'Hanya quotation yang bisa dikonfirmasi.' }

    const [updated] = await tx
      .update(salesOrders)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(salesOrders.id, id))
      .returning()

    return { ok: true as const, so: updated! }
  })
}

// ── Create Invoice from SO ────────────────────────────────────────────────────

export async function createInvoiceFromSO(
  tenantId: string,
  id: string,
  userId: string,
): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  const soData = await getSO(tenantId, id)
  if (!soData) return { ok: false, error: 'SO tidak ditemukan.' }
  if (!['confirmed', 'done'].includes(soData.so.status)) {
    return { ok: false, error: 'SO harus dikonfirmasi sebelum membuat faktur.' }
  }
  if (soData.so.invoiceId) return { ok: false, error: 'Faktur sudah dibuat untuk SO ini.' }

  const billableLines = soData.lines
    .filter((l) => l.accountId)
    .map((l) => ({
      description: l.description,
      quantity:    l.qty,
      unitPrice:   l.unitPrice,
      accountId:   l.accountId!,
      taxIds:      l.taxIds,
    }))

  if (billableLines.length === 0) {
    return { ok: false, error: 'Tidak ada baris dengan akun pendapatan yang valid.' }
  }

  const invoice = await createInvoice({
    tenantId,
    userId,
    contactId:    soData.so.contactId ?? null,
    customerName: soData.so.customerName,
    date:         new Date().toISOString().slice(0, 10),
    dueDate:      new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
    notes:        `Dibuat dari ${soData.so.soNumber}`,
    lines:        billableLines,
  })

  await withTenant(tenantId, (tx) =>
    tx.update(salesOrders)
      .set({ invoiceId: invoice.id, status: 'done', updatedAt: new Date() })
      .where(eq(salesOrders.id, id)),
  )

  return { ok: true, invoiceId: invoice.id }
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelSO(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [so] = await tx
      .select({ status: salesOrders.status })
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1)

    if (!so) return { ok: false as const, error: 'SO tidak ditemukan.' }
    if (!['quotation', 'confirmed'].includes(so.status)) {
      return { ok: false as const, error: 'Hanya quotation atau confirmed yang bisa dibatalkan.' }
    }

    await tx.update(salesOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(salesOrders.id, id))

    return { ok: true as const }
  })
}

// ── Totals helper ─────────────────────────────────────────────────────────────

export function soSubtotal(lines: SoLine[]): number {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
}
