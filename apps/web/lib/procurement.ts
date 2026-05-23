import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  purchaseOrders, poLines, products, contacts,
  type PurchaseOrder, type PoLine, type PoStatus,
} from '@kantorcore/db'
import { withTenant } from './db'
import { createBill } from './finance'
import { createMove, listLocations } from './inventory'

export type { PurchaseOrder, PoLine, PoStatus }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PoLineInput {
  productId?: string | null
  productType?: string | null
  description: string
  qty: number
  unitPrice: number
  accountId?: string | null
  taxIds?: string[]
}

export interface PoWithLines {
  po: PurchaseOrder
  lines: (PoLine & { productName: string | null; productCode: string | null })[]
  vendorContact: { id: string; name: string; email: string | null } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextPoNumber(tx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.tenantId, tenantId),
        sql`EXTRACT(YEAR FROM created_at) = ${year}`,
      ),
    )
  const seq = String(count + 1).padStart(4, '0')
  return `PO/${year}/${seq}`
}

// ── List & Get ────────────────────────────────────────────────────────────────

export async function listPOs(
  tenantId: string,
  opts: { status?: PoStatus } = {},
): Promise<PurchaseOrder[]> {
  return withTenant(tenantId, (tx) => {
    const where = opts.status
      ? and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.status, opts.status))
      : eq(purchaseOrders.tenantId, tenantId)
    return tx.select().from(purchaseOrders).where(where!).orderBy(desc(purchaseOrders.createdAt))
  })
}

export async function getPO(tenantId: string, id: string): Promise<PoWithLines | null> {
  return withTenant(tenantId, async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1)

    if (!po) return null

    const lines = await tx
      .select({
        line: poLines,
        productName: products.name,
        productCode: products.code,
      })
      .from(poLines)
      .leftJoin(products, eq(poLines.productId, products.id))
      .where(eq(poLines.poId, id))
      .orderBy(asc(poLines.id))

    let vendorContact: PoWithLines['vendorContact'] = null
    if (po.contactId) {
      const [c] = await tx
        .select({ id: contacts.id, name: contacts.name, email: contacts.email })
        .from(contacts)
        .where(eq(contacts.id, po.contactId))
        .limit(1)
      if (c) vendorContact = c
    }

    return {
      po,
      lines: lines.map((r) => ({
        ...r.line,
        productName: r.productName ?? null,
        productCode: r.productCode ?? null,
      })),
      vendorContact,
    }
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createPO(input: {
  tenantId: string
  userId: string
  contactId?: string | null
  vendorName: string
  date: string
  expectedDate?: string | null
  notes?: string | null
  lines: PoLineInput[]
}): Promise<{ ok: true; po: PurchaseOrder } | { ok: false; error: string }> {
  if (!input.vendorName.trim()) return { ok: false, error: 'Nama vendor wajib diisi.' }
  if (input.lines.length === 0) return { ok: false, error: 'Tambahkan minimal satu baris.' }

  return withTenant(input.tenantId, async (tx) => {
    const poNumber = await nextPoNumber(tx, input.tenantId)

    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        tenantId:     input.tenantId,
        poNumber,
        status:       'draft',
        contactId:    input.contactId ?? null,
        vendorName:   input.vendorName.trim(),
        date:         input.date,
        expectedDate: input.expectedDate ?? null,
        notes:        input.notes?.trim() ?? null,
        createdBy:    input.userId,
      })
      .returning()

    await tx.insert(poLines).values(
      input.lines.map((l) => ({
        tenantId:    input.tenantId,
        poId:        po!.id,
        productId:   l.productId ?? null,
        productType: l.productType ?? null,
        description: l.description.trim(),
        qty:         l.qty,
        unitPrice:   l.unitPrice,
        accountId:   l.accountId ?? null,
        taxIds:      l.taxIds ?? [],
        receivedQty: 0,
      })),
    )

    return { ok: true as const, po: po! }
  })
}

// ── Confirm ───────────────────────────────────────────────────────────────────

export async function confirmPO(
  tenantId: string,
  id: string,
): Promise<{ ok: true; po: PurchaseOrder } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1)

    if (!po) return { ok: false as const, error: 'PO tidak ditemukan.' }
    if (po.status !== 'draft') return { ok: false as const, error: 'Hanya PO draft yang bisa dikonfirmasi.' }

    const [updated] = await tx
      .update(purchaseOrders)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning()

    return { ok: true as const, po: updated! }
  })
}

// ── Receive ───────────────────────────────────────────────────────────────────

export async function receivePO(
  tenantId: string,
  id: string,
  userId: string,
): Promise<{ ok: true; po: PurchaseOrder; movesCreated: number } | { ok: false; error: string }> {
  const poData = await getPO(tenantId, id)
  if (!poData) return { ok: false, error: 'PO tidak ditemukan.' }
  if (poData.po.status !== 'confirmed') return { ok: false, error: 'Hanya PO confirmed yang bisa diterima.' }

  // Resolve VENDOR → WH location codes
  const locations = await listLocations(tenantId)
  const vendorLoc = locations.find((l) => l.code === 'VENDOR')
  const whLoc     = locations.find((l) => l.code === 'WH')

  if (!vendorLoc || !whLoc) {
    return { ok: false, error: 'Lokasi stok belum di-seed. Kunjungi /inv/stock terlebih dahulu.' }
  }

  let movesCreated = 0
  for (const line of poData.lines) {
    // Only create stock moves for physical products
    if (line.productId && line.productType === 'product') {
      const remaining = line.qty - line.receivedQty
      if (remaining <= 0) continue

      const moveResult = await createMove({
        tenantId,
        productId:      line.productId,
        fromLocationId: vendorLoc.id,
        toLocationId:   whLoc.id,
        qty:            remaining,
        reference:      poData.po.poNumber,
        notes:          `Penerimaan dari ${poData.po.vendorName}`,
        userId,
      })

      if (moveResult.ok) {
        movesCreated++
        // Update received qty on line
        await withTenant(tenantId, (tx) =>
          tx.update(poLines)
            .set({ receivedQty: line.qty })
            .where(eq(poLines.id, line.id)),
        )
      }
    }
  }

  // Advance status
  const [updated] = await withTenant(tenantId, (tx) =>
    tx.update(purchaseOrders)
      .set({ status: 'received', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning(),
  )

  return { ok: true, po: updated!, movesCreated }
}

// ── Create Bill from PO ───────────────────────────────────────────────────────

export async function createBillFromPO(
  tenantId: string,
  id: string,
  userId: string,
): Promise<{ ok: true; billId: string } | { ok: false; error: string }> {
  const poData = await getPO(tenantId, id)
  if (!poData) return { ok: false, error: 'PO tidak ditemukan.' }
  if (!['confirmed', 'received'].includes(poData.po.status)) {
    return { ok: false, error: 'PO harus dikonfirmasi atau diterima sebelum membuat tagihan.' }
  }
  if (poData.po.billId) return { ok: false, error: 'Tagihan sudah dibuat untuk PO ini.' }

  const bill = await createBill({
    tenantId,
    userId,
    contactId:   poData.po.contactId ?? null,
    vendorName:  poData.po.vendorName,
    vendorRef:   poData.po.poNumber,
    date:        new Date().toISOString().slice(0, 10),
    dueDate:     new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
    notes:       `Dibuat dari ${poData.po.poNumber}`,
    lines:       poData.lines.map((l) => ({
      description: l.description,
      quantity:    l.qty,
      unitPrice:   l.unitPrice,
      accountId:   l.accountId ?? '',
      taxIds:      l.taxIds,
    })).filter((l) => l.accountId),
  })

  // Record bill reference on PO
  await withTenant(tenantId, (tx) =>
    tx.update(purchaseOrders)
      .set({ billId: bill.id, status: 'billed', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id)),
  )

  return { ok: true, billId: bill.id }
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelPO(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [po] = await tx
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1)

    if (!po) return { ok: false as const, error: 'PO tidak ditemukan.' }
    if (!['draft', 'confirmed'].includes(po.status)) {
      return { ok: false as const, error: 'Hanya PO draft atau confirmed yang bisa dibatalkan.' }
    }

    await tx.update(purchaseOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))

    return { ok: true as const }
  })
}

// ── Totals helper ─────────────────────────────────────────────────────────────

export function poSubtotal(lines: PoLine[]): number {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
}
