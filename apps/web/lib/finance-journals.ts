import 'server-only'
import { and, asc, desc, eq } from 'drizzle-orm'
import {
  journals, paymentTerms, paymentTermLines, indonesianBanks,
  type Journal, type NewJournal, type PaymentTerm, type PaymentTermLine,
} from '@kantorcore/db'
import { withTenant } from './db'

// ── Journals ──────────────────────────────────────────────────────────────────

export async function listJournals(tenantId: string): Promise<Journal[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(journals).where(and(eq(journals.tenantId, tenantId), eq(journals.active, true))).orderBy(asc(journals.code))
  )
}

export async function getJournal(tenantId: string, id: string): Promise<Journal | null> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx.select().from(journals).where(and(eq(journals.tenantId, tenantId), eq(journals.id, id))).limit(1)
    return row ?? null
  })
}

export async function upsertJournal(input: {
  tenantId: string
  id?: string
  code: string
  name: string
  type: Journal['type']
  currencyCode?: string
  sequencePrefix?: string | null
  isDefault?: boolean
}): Promise<Journal> {
  // Validate code: 2–5 uppercase alphanumeric
  if (!/^[A-Z0-9]{2,5}$/.test(input.code)) throw new Error('Journal code must be 2–5 uppercase alphanumeric characters.')
  return withTenant(input.tenantId, async (tx) => {
    if (input.id) {
      const [updated] = await tx.update(journals)
        .set({ code: input.code, name: input.name, type: input.type, currencyCode: input.currencyCode ?? 'IDR', sequencePrefix: input.sequencePrefix ?? null, isDefault: input.isDefault ?? false, updatedAt: new Date() })
        .where(and(eq(journals.tenantId, input.tenantId), eq(journals.id, input.id)))
        .returning()
      return updated!
    }
    const [created] = await tx.insert(journals).values({
      tenantId: input.tenantId, code: input.code, name: input.name, type: input.type,
      currencyCode: input.currencyCode ?? 'IDR', sequencePrefix: input.sequencePrefix ?? null,
      isDefault: input.isDefault ?? false,
    }).returning()
    return created!
  })
}

export async function seedDefaultJournals(tenantId: string, userId: string): Promise<number> {
  const defaults: Omit<NewJournal, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
    { code: 'SALE', name: 'Penjualan', type: 'sale',     currencyCode: 'IDR', sequencePrefix: 'INV', isDefault: true, active: true },
    { code: 'PURCH', name: 'Pembelian', type: 'purchase', currencyCode: 'IDR', sequencePrefix: 'BILL', isDefault: true, active: true },
    { code: 'BANK', name: 'Bank Utama', type: 'bank',    currencyCode: 'IDR', sequencePrefix: 'BNK', isDefault: true, active: true },
    { code: 'CASH', name: 'Kas',        type: 'cash',    currencyCode: 'IDR', sequencePrefix: 'CSH', isDefault: false, active: true },
    { code: 'MISC', name: 'Jurnal Umum', type: 'general', currencyCode: 'IDR', sequencePrefix: 'JE',  isDefault: false, active: true },
  ]
  return withTenant(tenantId, async (tx) => {
    let seeded = 0
    for (const d of defaults) {
      const existing = await tx.select({ id: journals.id }).from(journals).where(and(eq(journals.tenantId, tenantId), eq(journals.code, d.code))).limit(1)
      if (existing.length === 0) {
        await tx.insert(journals).values({ ...d, tenantId })
        seeded++
      }
    }
    return seeded
  })
}

// ── Payment Terms ─────────────────────────────────────────────────────────────

export interface PaymentTermWithLines extends PaymentTerm {
  lines: PaymentTermLine[]
}

export async function listPaymentTerms(tenantId: string): Promise<PaymentTermWithLines[]> {
  return withTenant(tenantId, async (tx) => {
    const terms = await tx.select().from(paymentTerms).where(eq(paymentTerms.tenantId, tenantId)).orderBy(asc(paymentTerms.name))
    if (terms.length === 0) return []
    const termIds = terms.map((t) => t.id)
    const lines = await tx.select().from(paymentTermLines)
      .where(eq(paymentTermLines.paymentTermId, termIds[0]!))  // simplified — load all by filter
    // Load all lines for all terms
    const allLines = await tx.select().from(paymentTermLines)
    const byTerm = new Map<string, PaymentTermLine[]>()
    for (const l of allLines) {
      if (!termIds.includes(l.paymentTermId)) continue
      const list = byTerm.get(l.paymentTermId) ?? []
      list.push(l)
      byTerm.set(l.paymentTermId, list)
    }
    return terms.map((t) => ({ ...t, lines: (byTerm.get(t.id) ?? []).sort((a, b) => a.sequence - b.sequence) }))
  })
}

export async function upsertPaymentTerm(input: {
  tenantId: string
  id?: string
  name: string
  note?: string | null
  lines: { sequence: number; valuePercent: number; daysOffset: number }[]
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const totalPct = input.lines.reduce((s, l) => s + l.valuePercent, 0)
  if (Math.abs(totalPct - 100) > 0.01) return { ok: false, error: `Sum of installment percentages must equal 100% (got ${totalPct.toFixed(2)}%).` }

  return withTenant(input.tenantId, async (tx) => {
    let termId: string
    if (input.id) {
      await tx.update(paymentTerms).set({ name: input.name, note: input.note ?? null, updatedAt: new Date() }).where(eq(paymentTerms.id, input.id))
      termId = input.id
    } else {
      const [created] = await tx.insert(paymentTerms).values({ tenantId: input.tenantId, name: input.name, note: input.note ?? null }).returning()
      termId = created!.id
    }
    // Replace lines
    await tx.delete(paymentTermLines).where(eq(paymentTermLines.paymentTermId, termId))
    if (input.lines.length > 0) {
      await tx.insert(paymentTermLines).values(
        input.lines.map((l) => ({ paymentTermId: termId, sequence: l.sequence, valuePercent: String(l.valuePercent), daysOffset: l.daysOffset }))
      )
    }
    return { ok: true, id: termId }
  })
}

// ── Indonesian Bank Master ────────────────────────────────────────────────────

export async function listIndonesianBanks() {
  // No tenant scope — global reference table
  const { getDb } = await import('./db')
  const db = getDb()
  return db.select().from(indonesianBanks).where(eq(indonesianBanks.active, true)).orderBy(asc(indonesianBanks.name))
}

export const INDONESIAN_BANK_SEED = [
  { code: 'BCA',     name: 'Bank Central Asia',              swiftCode: 'CENAIDJA' },
  { code: 'MANDIRI', name: 'Bank Mandiri',                   swiftCode: 'BMRIIDJA' },
  { code: 'BRI',     name: 'Bank Rakyat Indonesia',          swiftCode: 'BRINIDJA' },
  { code: 'BNI',     name: 'Bank Negara Indonesia',          swiftCode: 'BNINIDJA' },
  { code: 'BTN',     name: 'Bank Tabungan Negara',           swiftCode: 'BTANIDJA' },
  { code: 'CIMB',    name: 'CIMB Niaga',                     swiftCode: 'BNIAIDJA' },
  { code: 'DANAMON', name: 'Bank Danamon',                   swiftCode: 'BDINIDJA' },
  { code: 'OCBC',    name: 'OCBC Indonesia',                 swiftCode: 'ONIAIDJA' },
  { code: 'PANIN',   name: 'Panin Bank',                     swiftCode: 'PINBIDJA' },
  { code: 'PERMATA', name: 'Bank Permata',                   swiftCode: 'BBBAIDJA' },
  { code: 'MEGA',    name: 'Bank Mega',                      swiftCode: 'MKBKIDJA' },
  { code: 'MAYBANK', name: 'Maybank Indonesia',              swiftCode: 'MBBEIDJA' },
  { code: 'HSBC',    name: 'HSBC Indonesia',                 swiftCode: 'HSBCIDJA' },
  { code: 'STANDARD', name: 'Standard Chartered Indonesia',  swiftCode: 'SCBLIDJX' },
  { code: 'DBS',     name: 'Bank DBS Indonesia',             swiftCode: 'DBSSIDJX' },
  { code: 'BSI',     name: 'Bank Syariah Indonesia',         swiftCode: 'BSMDIDJA' },
  { code: 'MUAMALAT', name: 'Bank Muamalat',                 swiftCode: 'MUABIDJA' },
  { code: 'GOTO',    name: 'Bank Jago (GoPay)',              swiftCode: null },
  { code: 'SEA',     name: 'SeaBank Indonesia',              swiftCode: null },
  { code: 'BLU',     name: 'blu by BCA Digital',            swiftCode: null },
]

export const JOURNAL_TYPE_LABEL: Record<string, string> = {
  sale: 'Penjualan', purchase: 'Pembelian', bank: 'Bank', cash: 'Kas', general: 'Jurnal Umum',
}
