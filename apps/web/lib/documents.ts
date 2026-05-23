import { and, asc, desc, eq, sql, lte, gte } from 'drizzle-orm'
import {
  documents, contacts,
  type Document, type DocStatus, type DocType,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { Document, DocStatus, DocType }

// ── Constants ─────────────────────────────────────────────────────────────────

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  contract:  'Kontrak',
  nda:       'NDA',
  mou:       'MoU',
  agreement: 'Perjanjian',
  po:        'Purchase Order',
  invoice:   'Faktur',
  permit:    'Izin',
  other:     'Lainnya',
}

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft:      'Draft',
  active:     'Aktif',
  expired:    'Kadaluarsa',
  terminated: 'Diberhentikan',
}

export const DOC_STATUS_COLOR: Record<DocStatus, string> = {
  draft:      'var(--fg-3)',
  active:     'var(--teal)',
  expired:    'var(--danger)',
  terminated: '#6B7280',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextDocNumber(tx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, tenantId),
        sql`EXTRACT(YEAR FROM created_at) = ${year}`,
      ),
    )
  return `DOC/${year}/${String(count + 1).padStart(4, '0')}`
}

/** Days until expiry. Negative = already expired. */
export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const diff = new Date(expiryDate).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

// ── List & Get ────────────────────────────────────────────────────────────────

export interface DocumentRow {
  doc: Document
  contactName: string | null
  daysUntilExpiry: number | null
}

export async function listDocuments(
  tenantId: string,
  opts: { status?: DocStatus; type?: DocType } = {},
): Promise<DocumentRow[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(documents.tenantId, tenantId)]
    if (opts.status) conditions.push(eq(documents.status, opts.status))
    if (opts.type) conditions.push(eq(documents.type, opts.type))

    const rows = await tx
      .select({ doc: documents, contactName: contacts.name })
      .from(documents)
      .leftJoin(contacts, eq(documents.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))

    return rows.map((r) => ({
      doc: r.doc,
      contactName: r.contactName ?? null,
      daysUntilExpiry: daysUntilExpiry(r.doc.expiryDate),
    }))
  })
}

export async function getDocument(tenantId: string, id: string): Promise<DocumentRow | null> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({ doc: documents, contactName: contacts.name })
      .from(documents)
      .leftJoin(contacts, eq(documents.contactId, contacts.id))
      .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
      .limit(1)

    if (!row) return null
    return {
      doc: row.doc,
      contactName: row.contactName ?? null,
      daysUntilExpiry: daysUntilExpiry(row.doc.expiryDate),
    }
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createDocument(input: {
  tenantId: string
  userId: string
  title: string
  type: DocType
  contactId?: string | null
  partyName?: string | null
  startDate?: string | null
  expiryDate?: string | null
  value?: number
  fileUrl?: string | null
  notes?: string | null
}): Promise<{ ok: true; doc: Document } | { ok: false; error: string }> {
  if (!input.title.trim()) return { ok: false, error: 'Judul dokumen wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const docNumber = await nextDocNumber(tx, input.tenantId)

    const [doc] = await tx
      .insert(documents)
      .values({
        tenantId:   input.tenantId,
        docNumber,
        title:      input.title.trim(),
        type:       input.type,
        status:     'draft',
        contactId:  input.contactId ?? null,
        partyName:  input.partyName?.trim() ?? null,
        startDate:  input.startDate ?? null,
        expiryDate: input.expiryDate ?? null,
        value:      input.value ?? 0,
        fileUrl:    input.fileUrl?.trim() ?? null,
        notes:      input.notes?.trim() ?? null,
        createdBy:  input.userId,
      })
      .returning()

    return { ok: true as const, doc: doc! }
  })
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateDocStatus(
  tenantId: string,
  id: string,
  status: DocStatus,
): Promise<{ ok: true; doc: Document } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ status: documents.status })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
      .limit(1)

    if (!existing) return { ok: false as const, error: 'Dokumen tidak ditemukan.' }

    const [updated] = await tx
      .update(documents)
      .set({ status, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning()

    return { ok: true as const, doc: updated! }
  })
}

// ── Expiry alerts ─────────────────────────────────────────────────────────────

export async function getExpiringDocuments(
  tenantId: string,
  withinDays = 30,
): Promise<DocumentRow[]> {
  const all = await listDocuments(tenantId, { status: 'active' })
  return all.filter((r) => {
    const d = r.daysUntilExpiry
    return d !== null && d >= 0 && d <= withinDays
  })
}
