import 'server-only'
import { and, asc, desc, eq, sql, inArray } from 'drizzle-orm'
import {
  accounts,
  journalEntries,
  journalEntryLines,
  invoices,
  invoiceLines,
  bills,
  billLines,
  type Account,
  type Invoice,
  type InvoiceLine,
  type Bill,
  type BillLine,
  type JournalEntry,
  type JournalEntryLine,
} from '@kantorcore/db'
import { withTenant } from './db'

// ── Default Chart of Accounts (Indonesian SAK simplified) ─────────────────────

interface SeedAccount {
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  isReconcilable?: boolean
  description?: string
}

export const DEFAULT_COA: SeedAccount[] = [
  // Aset (1xxx)
  { code: '1100', name: 'Kas', type: 'asset', isReconcilable: true, description: 'Kas tunai di tangan.' },
  { code: '1110', name: 'Bank', type: 'asset', isReconcilable: true, description: 'Rekening bank operasional.' },
  { code: '1200', name: 'Piutang Usaha', type: 'asset', isReconcilable: true, description: 'Piutang dari pelanggan atas faktur belum lunas.' },
  { code: '1300', name: 'Persediaan', type: 'asset', description: 'Persediaan barang dagang.' },
  { code: '1500', name: 'Aset Tetap', type: 'asset', description: 'Tanah, bangunan, kendaraan, peralatan.' },
  { code: '1510', name: 'Akumulasi Penyusutan', type: 'asset', description: 'Akumulasi penyusutan aset tetap (saldo kredit).' },

  // Liabilitas (2xxx)
  { code: '2100', name: 'Utang Usaha', type: 'liability', isReconcilable: true, description: 'Utang ke vendor atas tagihan belum dibayar.' },
  { code: '2200', name: 'Utang Pajak — PPN Keluaran', type: 'liability', description: 'PPN yang dipungut dari pelanggan.' },
  { code: '2210', name: 'Utang Pajak — PPh 21', type: 'liability', description: 'PPh karyawan terutang.' },
  { code: '2300', name: 'Utang Gaji', type: 'liability', description: 'Gaji karyawan terutang.' },

  // Ekuitas (3xxx)
  { code: '3100', name: 'Modal Disetor', type: 'equity', description: 'Modal pemilik.' },
  { code: '3200', name: 'Laba Ditahan', type: 'equity', description: 'Akumulasi laba periode-periode sebelumnya.' },

  // Pendapatan (4xxx)
  { code: '4100', name: 'Pendapatan Usaha', type: 'revenue', description: 'Pendapatan dari penjualan barang/jasa utama.' },
  { code: '4200', name: 'Pendapatan Sewa', type: 'revenue', description: 'Pendapatan dari penyewaan aset.' },
  { code: '4900', name: 'Pendapatan Lain-lain', type: 'revenue', description: 'Pendapatan di luar usaha utama.' },

  // Beban (5xxx)
  { code: '5100', name: 'Harga Pokok Penjualan', type: 'expense', description: 'Beban langsung produk/jasa yang dijual.' },
  { code: '5200', name: 'Beban Gaji', type: 'expense', description: 'Gaji dan tunjangan karyawan.' },
  { code: '5300', name: 'Beban Sewa', type: 'expense', description: 'Sewa kantor, peralatan.' },
  { code: '5400', name: 'Beban Utilitas', type: 'expense', description: 'Listrik, air, internet.' },
  { code: '5500', name: 'Beban Operasional', type: 'expense', description: 'Beban operasional umum lainnya.' },
  { code: '5900', name: 'Beban Penyusutan', type: 'expense', description: 'Penyusutan aset tetap.' },
]

/**
 * Idempotent: inserts only missing accounts. Existing accounts are left
 * untouched so user customizations to defaults are preserved.
 * Returns number of accounts inserted.
 */
export async function seedDefaultAccounts(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    const existing = await tx
      .select({ code: accounts.code })
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))

    const have = new Set(existing.map((r) => r.code))
    const missing = DEFAULT_COA.filter((a) => !have.has(a.code))
    if (missing.length === 0) return 0

    await tx.insert(accounts).values(
      missing.map((a) => ({
        tenantId,
        code: a.code,
        name: a.name,
        type: a.type,
        isReconcilable: a.isReconcilable ?? false,
        description: a.description ?? null,
      })),
    )
    return missing.length
  })
}

// ── Account queries ───────────────────────────────────────────────────────────

export async function listAccounts(tenantId: string): Promise<Account[]> {
  return withTenant(tenantId, async (tx) => {
    return tx
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))
      .orderBy(asc(accounts.code))
  })
}

export async function getAccount(tenantId: string, id: string): Promise<Account | null> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))
      .limit(1)
    return row ?? null
  })
}

// ── Doc numbering ─────────────────────────────────────────────────────────────

/** Generates next sequential doc number per (tenant, year, prefix). */
async function nextDocNumber(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  prefix: string,
  table: typeof invoices | typeof bills | typeof journalEntries,
  numberCol: 'invoiceNumber' | 'billNumber' | 'entryNumber',
): Promise<string> {
  const year = new Date().getFullYear()
  const like = `${prefix}-${year}-%`
  const rows = await tx.execute(
    sql`SELECT ${sql.identifier(numberCol === 'invoiceNumber' ? 'invoice_number' : numberCol === 'billNumber' ? 'bill_number' : 'entry_number')} as num
        FROM ${table}
        WHERE tenant_id = ${tenantId}
          AND ${sql.identifier(numberCol === 'invoiceNumber' ? 'invoice_number' : numberCol === 'billNumber' ? 'bill_number' : 'entry_number')} LIKE ${like}
        ORDER BY 1 DESC
        LIMIT 1`,
  )
  const last = (rows as unknown as { num: string }[])[0]?.num
  let seq = 1
  if (last) {
    const m = last.match(/-(\d+)$/)
    if (m) seq = parseInt(m[1]!, 10) + 1
  }
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}

// ── Invoices (AR) ─────────────────────────────────────────────────────────────

export interface InvoiceWithLines {
  invoice: Invoice
  lines: (InvoiceLine & { accountCode: string; accountName: string })[]
  total: number
}

export async function listInvoices(
  tenantId: string,
  opts: { status?: 'draft' | 'confirmed' | 'paid' | 'cancelled' } = {},
  limit = 100,
): Promise<(Invoice & { total: number })[]> {
  return withTenant(tenantId, async (tx) => {
    const where = [eq(invoices.tenantId, tenantId)]
    if (opts.status) where.push(eq(invoices.status, opts.status))
    const rows = await tx
      .select()
      .from(invoices)
      .where(and(...where))
      .orderBy(desc(invoices.date), desc(invoices.createdAt))
      .limit(limit)
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const totals = await tx
      .select({
        invoiceId: invoiceLines.invoiceId,
        total: sql<number>`COALESCE(SUM(${invoiceLines.quantity} * ${invoiceLines.unitPrice}), 0)::bigint`,
      })
      .from(invoiceLines)
      .where(and(eq(invoiceLines.tenantId, tenantId), inArray(invoiceLines.invoiceId, ids)))
      .groupBy(invoiceLines.invoiceId)

    const totalMap = new Map(totals.map((t) => [t.invoiceId, Number(t.total)]))
    return rows.map((r) => ({ ...r, total: totalMap.get(r.id) ?? 0 }))
  })
}

export async function getInvoice(tenantId: string, id: string): Promise<InvoiceWithLines | null> {
  return withTenant(tenantId, async (tx) => {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)))
      .limit(1)
    if (!inv) return null

    const lines = await tx
      .select({
        line: invoiceLines,
        accountCode: accounts.code,
        accountName: accounts.name,
      })
      .from(invoiceLines)
      .innerJoin(accounts, eq(invoiceLines.accountId, accounts.id))
      .where(and(eq(invoiceLines.tenantId, tenantId), eq(invoiceLines.invoiceId, id)))
      .orderBy(asc(invoiceLines.createdAt))

    const total = lines.reduce((s, l) => s + l.line.quantity * l.line.unitPrice, 0)
    return {
      invoice: inv,
      lines: lines.map((l) => ({ ...l.line, accountCode: l.accountCode, accountName: l.accountName })),
      total,
    }
  })
}

export async function createInvoice(input: {
  tenantId: string
  userId: string
  customerName: string
  customerEmail?: string | null
  date: string
  dueDate: string
  notes?: string | null
  lines: { description: string; quantity: number; unitPrice: number; accountId: string }[]
}): Promise<Invoice> {
  return withTenant(input.tenantId, async (tx) => {
    const invoiceNumber = await nextDocNumber(tx, input.tenantId, 'INV', invoices, 'invoiceNumber')

    const [inv] = await tx
      .insert(invoices)
      .values({
        tenantId: input.tenantId,
        invoiceNumber,
        status: 'draft',
        customerName: input.customerName,
        customerEmail: input.customerEmail ?? null,
        date: input.date,
        dueDate: input.dueDate,
        notes: input.notes ?? null,
        createdBy: input.userId,
      })
      .returning()

    if (input.lines.length > 0) {
      await tx.insert(invoiceLines).values(
        input.lines.map((l) => ({
          tenantId: input.tenantId,
          invoiceId: inv!.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          accountId: l.accountId,
        })),
      )
    }
    return inv!
  })
}

// ── Bills (AP) ────────────────────────────────────────────────────────────────

export interface BillWithLines {
  bill: Bill
  lines: (BillLine & { accountCode: string; accountName: string })[]
  total: number
}

export async function listBills(
  tenantId: string,
  opts: { status?: 'draft' | 'confirmed' | 'paid' | 'cancelled' } = {},
  limit = 100,
): Promise<(Bill & { total: number })[]> {
  return withTenant(tenantId, async (tx) => {
    const where = [eq(bills.tenantId, tenantId)]
    if (opts.status) where.push(eq(bills.status, opts.status))
    const rows = await tx
      .select()
      .from(bills)
      .where(and(...where))
      .orderBy(desc(bills.date), desc(bills.createdAt))
      .limit(limit)
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const totals = await tx
      .select({
        billId: billLines.billId,
        total: sql<number>`COALESCE(SUM(${billLines.quantity} * ${billLines.unitPrice}), 0)::bigint`,
      })
      .from(billLines)
      .where(and(eq(billLines.tenantId, tenantId), inArray(billLines.billId, ids)))
      .groupBy(billLines.billId)

    const totalMap = new Map(totals.map((t) => [t.billId, Number(t.total)]))
    return rows.map((r) => ({ ...r, total: totalMap.get(r.id) ?? 0 }))
  })
}

export async function getBill(tenantId: string, id: string): Promise<BillWithLines | null> {
  return withTenant(tenantId, async (tx) => {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(and(eq(bills.tenantId, tenantId), eq(bills.id, id)))
      .limit(1)
    if (!bill) return null

    const lines = await tx
      .select({
        line: billLines,
        accountCode: accounts.code,
        accountName: accounts.name,
      })
      .from(billLines)
      .innerJoin(accounts, eq(billLines.accountId, accounts.id))
      .where(and(eq(billLines.tenantId, tenantId), eq(billLines.billId, id)))
      .orderBy(asc(billLines.createdAt))

    const total = lines.reduce((s, l) => s + l.line.quantity * l.line.unitPrice, 0)
    return {
      bill,
      lines: lines.map((l) => ({ ...l.line, accountCode: l.accountCode, accountName: l.accountName })),
      total,
    }
  })
}

export async function createBill(input: {
  tenantId: string
  userId: string
  vendorName: string
  vendorRef?: string | null
  date: string
  dueDate: string
  notes?: string | null
  lines: { description: string; quantity: number; unitPrice: number; accountId: string }[]
}): Promise<Bill> {
  return withTenant(input.tenantId, async (tx) => {
    const billNumber = await nextDocNumber(tx, input.tenantId, 'BILL', bills, 'billNumber')

    const [bill] = await tx
      .insert(bills)
      .values({
        tenantId: input.tenantId,
        billNumber,
        status: 'draft',
        vendorName: input.vendorName,
        vendorRef: input.vendorRef ?? null,
        date: input.date,
        dueDate: input.dueDate,
        notes: input.notes ?? null,
        createdBy: input.userId,
      })
      .returning()

    if (input.lines.length > 0) {
      await tx.insert(billLines).values(
        input.lines.map((l) => ({
          tenantId: input.tenantId,
          billId: bill!.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          accountId: l.accountId,
        })),
      )
    }
    return bill!
  })
}

// ── Posting (state transitions + journal entry creation) ──────────────────────

/**
 * Confirms an invoice: creates a posted journal entry
 *   Debit  Piutang Usaha (1200)       total
 *   Credit Pendapatan / line accounts total
 */
export async function confirmInvoice(
  tenantId: string,
  userId: string,
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [inv] = await tx.select().from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId))).limit(1)
    if (!inv) return { ok: false, error: 'Faktur tidak ditemukan.' }
    if (inv.status !== 'draft') return { ok: false, error: 'Faktur sudah diproses.' }

    const lines = await tx.select().from(invoiceLines)
      .where(and(eq(invoiceLines.tenantId, tenantId), eq(invoiceLines.invoiceId, invoiceId)))
    if (lines.length === 0) return { ok: false, error: 'Faktur tidak memiliki baris.' }

    const ar = await findAccountByCode(tx, tenantId, '1200')
    if (!ar) return { ok: false, error: 'Akun Piutang Usaha (1200) tidak ditemukan. Jalankan seed Chart of Accounts.' }

    const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    const entryNumber = await nextDocNumber(tx, tenantId, 'JE', journalEntries, 'entryNumber')

    const [je] = await tx.insert(journalEntries).values({
      tenantId,
      entryNumber,
      date: inv.date,
      description: `Faktur ${inv.invoiceNumber} — ${inv.customerName}`,
      status: 'posted',
      referenceType: 'invoice',
      referenceId: inv.id,
      createdBy: userId,
      postedAt: new Date(),
    }).returning()

    // Debit AR, credit revenue (per line)
    const jelRows = [
      {
        tenantId,
        entryId: je!.id,
        accountId: ar.id,
        description: `Piutang dari ${inv.customerName}`,
        debit: total,
        credit: 0,
      },
      ...lines.map((l) => ({
        tenantId,
        entryId: je!.id,
        accountId: l.accountId,
        description: l.description,
        debit: 0,
        credit: l.quantity * l.unitPrice,
      })),
    ]
    await tx.insert(journalEntryLines).values(jelRows)

    await tx.update(invoices)
      .set({ status: 'confirmed', journalEntryId: je!.id, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))

    return { ok: true }
  })
}

/**
 * Confirms a bill: creates a posted journal entry
 *   Debit  Beban / line accounts total
 *   Credit Utang Usaha (2100)        total
 */
export async function confirmBill(
  tenantId: string,
  userId: string,
  billId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [bill] = await tx.select().from(bills)
      .where(and(eq(bills.tenantId, tenantId), eq(bills.id, billId))).limit(1)
    if (!bill) return { ok: false, error: 'Tagihan tidak ditemukan.' }
    if (bill.status !== 'draft') return { ok: false, error: 'Tagihan sudah diproses.' }

    const lines = await tx.select().from(billLines)
      .where(and(eq(billLines.tenantId, tenantId), eq(billLines.billId, billId)))
    if (lines.length === 0) return { ok: false, error: 'Tagihan tidak memiliki baris.' }

    const ap = await findAccountByCode(tx, tenantId, '2100')
    if (!ap) return { ok: false, error: 'Akun Utang Usaha (2100) tidak ditemukan. Jalankan seed Chart of Accounts.' }

    const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    const entryNumber = await nextDocNumber(tx, tenantId, 'JE', journalEntries, 'entryNumber')

    const [je] = await tx.insert(journalEntries).values({
      tenantId,
      entryNumber,
      date: bill.date,
      description: `Tagihan ${bill.billNumber} — ${bill.vendorName}`,
      status: 'posted',
      referenceType: 'bill',
      referenceId: bill.id,
      createdBy: userId,
      postedAt: new Date(),
    }).returning()

    const jelRows = [
      ...lines.map((l) => ({
        tenantId,
        entryId: je!.id,
        accountId: l.accountId,
        description: l.description,
        debit: l.quantity * l.unitPrice,
        credit: 0,
      })),
      {
        tenantId,
        entryId: je!.id,
        accountId: ap.id,
        description: `Utang ke ${bill.vendorName}`,
        debit: 0,
        credit: total,
      },
    ]
    await tx.insert(journalEntryLines).values(jelRows)

    await tx.update(bills)
      .set({ status: 'confirmed', journalEntryId: je!.id, updatedAt: new Date() })
      .where(eq(bills.id, billId))

    return { ok: true }
  })
}

/**
 * Marks an invoice as paid: creates a journal entry
 *   Debit  Kas/Bank        total
 *   Credit Piutang Usaha   total
 * Uses account code 1110 (Bank) by default. Caller may pass another asset account.
 */
export async function payInvoice(
  tenantId: string,
  userId: string,
  invoiceId: string,
  cashAccountCode = '1110',
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [inv] = await tx.select().from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId))).limit(1)
    if (!inv) return { ok: false, error: 'Faktur tidak ditemukan.' }
    if (inv.status !== 'confirmed') return { ok: false, error: 'Faktur harus dikonfirmasi sebelum ditandai lunas.' }

    const lines = await tx.select().from(invoiceLines)
      .where(and(eq(invoiceLines.tenantId, tenantId), eq(invoiceLines.invoiceId, invoiceId)))
    const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

    const ar = await findAccountByCode(tx, tenantId, '1200')
    const cash = await findAccountByCode(tx, tenantId, cashAccountCode)
    if (!ar || !cash) return { ok: false, error: 'Akun Piutang/Kas tidak ditemukan.' }

    const entryNumber = await nextDocNumber(tx, tenantId, 'JE', journalEntries, 'entryNumber')
    const [je] = await tx.insert(journalEntries).values({
      tenantId,
      entryNumber,
      date: new Date().toISOString().slice(0, 10),
      description: `Pelunasan ${inv.invoiceNumber} — ${inv.customerName}`,
      status: 'posted',
      referenceType: 'invoice_payment',
      referenceId: inv.id,
      createdBy: userId,
      postedAt: new Date(),
    }).returning()

    await tx.insert(journalEntryLines).values([
      { tenantId, entryId: je!.id, accountId: cash.id, description: `Pelunasan ${inv.invoiceNumber}`, debit: total, credit: 0 },
      { tenantId, entryId: je!.id, accountId: ar.id, description: `Hapus piutang ${inv.invoiceNumber}`, debit: 0, credit: total },
    ])

    await tx.update(invoices).set({ status: 'paid', updatedAt: new Date() }).where(eq(invoices.id, invoiceId))
    return { ok: true }
  })
}

/** Marks an invoice as cancelled. Only allowed from draft (no journal posted yet). */
export async function cancelInvoice(
  tenantId: string,
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [inv] = await tx.select().from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId))).limit(1)
    if (!inv) return { ok: false, error: 'Faktur tidak ditemukan.' }
    if (inv.status !== 'draft') return { ok: false, error: 'Hanya faktur draf yang dapat dibatalkan.' }
    await tx.update(invoices).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(invoices.id, invoiceId))
    return { ok: true }
  })
}

/** Mirror of payInvoice for vendor bills. */
export async function payBill(
  tenantId: string,
  userId: string,
  billId: string,
  cashAccountCode = '1110',
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [bill] = await tx.select().from(bills)
      .where(and(eq(bills.tenantId, tenantId), eq(bills.id, billId))).limit(1)
    if (!bill) return { ok: false, error: 'Tagihan tidak ditemukan.' }
    if (bill.status !== 'confirmed') return { ok: false, error: 'Tagihan harus dikonfirmasi sebelum dibayar.' }

    const lines = await tx.select().from(billLines)
      .where(and(eq(billLines.tenantId, tenantId), eq(billLines.billId, billId)))
    const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

    const ap = await findAccountByCode(tx, tenantId, '2100')
    const cash = await findAccountByCode(tx, tenantId, cashAccountCode)
    if (!ap || !cash) return { ok: false, error: 'Akun Utang/Kas tidak ditemukan.' }

    const entryNumber = await nextDocNumber(tx, tenantId, 'JE', journalEntries, 'entryNumber')
    const [je] = await tx.insert(journalEntries).values({
      tenantId,
      entryNumber,
      date: new Date().toISOString().slice(0, 10),
      description: `Pembayaran ${bill.billNumber} — ${bill.vendorName}`,
      status: 'posted',
      referenceType: 'bill_payment',
      referenceId: bill.id,
      createdBy: userId,
      postedAt: new Date(),
    }).returning()

    await tx.insert(journalEntryLines).values([
      { tenantId, entryId: je!.id, accountId: ap.id, description: `Hapus utang ${bill.billNumber}`, debit: total, credit: 0 },
      { tenantId, entryId: je!.id, accountId: cash.id, description: `Pembayaran ${bill.billNumber}`, debit: 0, credit: total },
    ])

    await tx.update(bills).set({ status: 'paid', updatedAt: new Date() }).where(eq(bills.id, billId))
    return { ok: true }
  })
}

export async function cancelBill(
  tenantId: string,
  billId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [bill] = await tx.select().from(bills)
      .where(and(eq(bills.tenantId, tenantId), eq(bills.id, billId))).limit(1)
    if (!bill) return { ok: false, error: 'Tagihan tidak ditemukan.' }
    if (bill.status !== 'draft') return { ok: false, error: 'Hanya tagihan draf yang dapat dibatalkan.' }
    await tx.update(bills).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(bills.id, billId))
    return { ok: true }
  })
}

async function findAccountByCode(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  code: string,
): Promise<Account | null> {
  const [row] = await tx
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, code)))
    .limit(1)
  return row ?? null
}

// ── Journal queries ───────────────────────────────────────────────────────────

export interface JournalEntryWithLines {
  entry: JournalEntry
  lines: (JournalEntryLine & { accountCode: string; accountName: string })[]
}

export async function listJournalEntries(tenantId: string, limit = 100): Promise<JournalEntry[]> {
  return withTenant(tenantId, async (tx) => {
    return tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId))
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
      .limit(limit)
  })
}

export async function getJournalEntry(tenantId: string, id: string): Promise<JournalEntryWithLines | null> {
  return withTenant(tenantId, async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.id, id)))
      .limit(1)
    if (!entry) return null

    const lines = await tx
      .select({
        line: journalEntryLines,
        accountCode: accounts.code,
        accountName: accounts.name,
      })
      .from(journalEntryLines)
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(eq(journalEntryLines.tenantId, tenantId), eq(journalEntryLines.entryId, id)))
      .orderBy(asc(journalEntryLines.createdAt))

    return {
      entry,
      lines: lines.map((l) => ({ ...l.line, accountCode: l.accountCode, accountName: l.accountName })),
    }
  })
}

// ── Display helpers ───────────────────────────────────────────────────────────

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export function formatIDR(amount: number): string {
  return IDR.format(amount)
}

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  asset: 'Aset',
  liability: 'Liabilitas',
  equity: 'Ekuitas',
  revenue: 'Pendapatan',
  expense: 'Beban',
}

export const DOC_STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  confirmed: 'Terkonfirmasi',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
}

export const DOC_STATUS_COLOR: Record<string, string> = {
  draft: 'var(--fg-3)',
  confirmed: 'var(--indigo)',
  paid: 'var(--teal)',
  cancelled: 'var(--fg-3)',
}
