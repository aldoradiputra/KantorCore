import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  salesOrders, soLines, products, contacts,
  type SalesOrder, type SoLine, type SoStatus,
} from '@kantorcore/db'
import { withTenant } from './db'
import { createInvoice } from './finance'

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
  const seq = String(count + 1).padStart(4, '0')
  return `SO/${year}/${seq}`
}

// ── List & Get ────────────────────────────────────────────────────────────────

export async function listSOs(
  tenantId: string,
  opts: { status?: SoStatus } = {},
): Promise<SalesOrder[]> {
  return withTenant(tenantId, (tx) => {
    const where = opts.status
      ? and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.status, opts.status))
      : eq(salesOrders.tenantId, tenantId)
    return tx.select().from(salesOrders).where(where!).orderBy(desc(salesOrders.createdAt))
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
}): Promise<{ ok: true; so: SalesOrder } | { ok: false; error: string }> {
  if (!input.customerName.trim()) return { ok: false, error: 'Nama pelanggan wajib diisi.' }
  if (input.lines.length === 0) return { ok: false, error: 'Tambahkan minimal satu baris.' }

  return withTenant(input.tenantId, async (tx) => {
    const soNumber = await nextSoNumber(tx, input.tenantId)

    const [so] = await tx
      .insert(salesOrders)
      .values({
        tenantId:     input.tenantId,
        soNumber,
        status:       'quotation',
        contactId:    input.contactId ?? null,
        customerName: input.customerName.trim(),
        date:         input.date,
        expiryDate:   input.expiryDate ?? null,
        notes:        input.notes?.trim() ?? null,
        createdBy:    input.userId,
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
