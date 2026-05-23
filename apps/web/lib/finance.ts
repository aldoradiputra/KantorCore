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
  taxGroups,
  taxes,
  invoiceLineTaxes,
  billLineTaxes,
  type Account,
  type Invoice,
  type InvoiceLine,
  type Bill,
  type BillLine,
  type JournalEntry,
  type JournalEntryLine,
  type Tax,
  type TaxGroup,
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
  { code: '1220', name: 'Pajak Dibayar di Muka — PPN Masukan', type: 'asset', isReconcilable: true, description: 'PPN yang dibayar atas pembelian (kredit pajak).' },
  { code: '1230', name: 'Pajak Dibayar di Muka — PPh 23', type: 'asset', isReconcilable: true, description: 'PPh 23 yang dipotong pelanggan atas jasa kami (kredit pajak).' },
  { code: '1500', name: 'Aset Tetap', type: 'asset', description: 'Tanah, bangunan, kendaraan, peralatan.' },
  { code: '1510', name: 'Akumulasi Penyusutan', type: 'asset', description: 'Akumulasi penyusutan aset tetap (saldo kredit).' },

  // Liabilitas (2xxx)
  { code: '2100', name: 'Utang Usaha', type: 'liability', isReconcilable: true, description: 'Utang ke vendor atas tagihan belum dibayar.' },
  { code: '2200', name: 'Utang Pajak — PPN Keluaran', type: 'liability', description: 'PPN yang dipungut dari pelanggan.' },
  { code: '2210', name: 'Utang Pajak — PPh 21', type: 'liability', description: 'PPh karyawan terutang.' },
  { code: '2220', name: 'Utang Pajak — PPh 23', type: 'liability', description: 'PPh dipotong atas jasa terutang.' },
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
  lines: (InvoiceLine & { accountCode: string; accountName: string; taxIds: string[] })[]
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

    const lineIds = lines.map((l) => l.line.id)
    const ltx = lineIds.length
      ? await tx.select({ lineId: invoiceLineTaxes.invoiceLineId, taxId: invoiceLineTaxes.taxId })
          .from(invoiceLineTaxes)
          .where(and(eq(invoiceLineTaxes.tenantId, tenantId), inArray(invoiceLineTaxes.invoiceLineId, lineIds)))
      : []
    const taxByLine = new Map<string, string[]>()
    for (const r of ltx) {
      const arr = taxByLine.get(r.lineId) ?? []
      arr.push(r.taxId)
      taxByLine.set(r.lineId, arr)
    }

    const total = lines.reduce((s, l) => s + l.line.quantity * l.line.unitPrice, 0)
    return {
      invoice: inv,
      lines: lines.map((l) => ({ ...l.line, accountCode: l.accountCode, accountName: l.accountName, taxIds: taxByLine.get(l.line.id) ?? [] })),
      total,
    }
  })
}

export async function createInvoice(input: {
  tenantId: string
  userId: string
  customerName: string
  customerEmail?: string | null
  contactId?: string | null
  date: string
  dueDate: string
  notes?: string | null
  displayTaxInline?: boolean
  lines: { description: string; quantity: number; unitPrice: number; accountId: string; taxIds?: string[] }[]
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
        contactId: input.contactId ?? null,
        date: input.date,
        dueDate: input.dueDate,
        notes: input.notes ?? null,
        displayTaxInline: input.displayTaxInline ?? false,
        createdBy: input.userId,
      })
      .returning()

    if (input.lines.length > 0) {
      const inserted = await tx.insert(invoiceLines).values(
        input.lines.map((l) => ({
          tenantId: input.tenantId,
          invoiceId: inv!.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          accountId: l.accountId,
        })),
      ).returning()

      const junctionRows: { tenantId: string; invoiceLineId: string; taxId: string }[] = []
      inserted.forEach((row, i) => {
        const tIds = input.lines[i]?.taxIds ?? []
        for (const tid of tIds) junctionRows.push({ tenantId: input.tenantId, invoiceLineId: row.id, taxId: tid })
      })
      if (junctionRows.length > 0) {
        await tx.insert(invoiceLineTaxes).values(junctionRows)
      }
    }
    return inv!
  })
}

// ── Bills (AP) ────────────────────────────────────────────────────────────────

export interface BillWithLines {
  bill: Bill
  lines: (BillLine & { accountCode: string; accountName: string; taxIds: string[] })[]
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

    const lineIds = lines.map((l) => l.line.id)
    const ltx = lineIds.length
      ? await tx.select({ lineId: billLineTaxes.billLineId, taxId: billLineTaxes.taxId })
          .from(billLineTaxes)
          .where(and(eq(billLineTaxes.tenantId, tenantId), inArray(billLineTaxes.billLineId, lineIds)))
      : []
    const taxByLine = new Map<string, string[]>()
    for (const r of ltx) {
      const arr = taxByLine.get(r.lineId) ?? []
      arr.push(r.taxId)
      taxByLine.set(r.lineId, arr)
    }

    const total = lines.reduce((s, l) => s + l.line.quantity * l.line.unitPrice, 0)
    return {
      bill,
      lines: lines.map((l) => ({ ...l.line, accountCode: l.accountCode, accountName: l.accountName, taxIds: taxByLine.get(l.line.id) ?? [] })),
      total,
    }
  })
}

export async function createBill(input: {
  tenantId: string
  userId: string
  vendorName: string
  vendorRef?: string | null
  contactId?: string | null
  date: string
  dueDate: string
  notes?: string | null
  displayTaxInline?: boolean
  lines: { description: string; quantity: number; unitPrice: number; accountId: string; taxIds?: string[] }[]
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
        contactId: input.contactId ?? null,
        date: input.date,
        dueDate: input.dueDate,
        notes: input.notes ?? null,
        displayTaxInline: input.displayTaxInline ?? false,
        createdBy: input.userId,
      })
      .returning()

    if (input.lines.length > 0) {
      const inserted = await tx.insert(billLines).values(
        input.lines.map((l) => ({
          tenantId: input.tenantId,
          billId: bill!.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          accountId: l.accountId,
        })),
      ).returning()

      const junctionRows: { tenantId: string; billLineId: string; taxId: string }[] = []
      inserted.forEach((row, i) => {
        const tIds = input.lines[i]?.taxIds ?? []
        for (const tid of tIds) junctionRows.push({ tenantId: input.tenantId, billLineId: row.id, taxId: tid })
      })
      if (junctionRows.length > 0) {
        await tx.insert(billLineTaxes).values(junctionRows)
      }
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

    const taxMap = await loadInvoiceLineTaxMap(tx, tenantId, lines.map((l) => l.id))

    type RevAccum = { accountId: string; description: string; amount: number }
    const revAccum: RevAccum[] = []
    const regularTax = new Map<string, { accountId: string; name: string; amount: number }>()
    const withholdingTax = new Map<string, { accountId: string; name: string; amount: number }>()
    let grandTotal = 0
    let withholdingTotal = 0
    for (const l of lines) {
      const subtotal = l.quantity * l.unitPrice
      const comp = computeLineTaxes(subtotal, taxMap.get(l.id) ?? [])
      revAccum.push({ accountId: l.accountId, description: l.description, amount: comp.baseAmount })
      grandTotal += comp.total
      for (const t of comp.taxes) {
        const bucket = t.isWithholding ? withholdingTax : regularTax
        if (t.isWithholding) withholdingTotal += t.amount
        const cur = bucket.get(t.taxAccountId)
        if (cur) cur.amount += t.amount
        else bucket.set(t.taxAccountId, { accountId: t.taxAccountId, name: t.taxName, amount: t.amount })
      }
    }

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

    // Sale-side withholding: customer withholds tax from us → record as prepaid asset (Dr).
    // AR debit = grandTotal - withholdingTotal (what customer will actually pay).
    const arAmount = grandTotal - withholdingTotal
    const jelRows: { tenantId: string; entryId: string; accountId: string; description: string; debit: number; credit: number }[] = [
      { tenantId, entryId: je!.id, accountId: ar.id, description: `Piutang dari ${inv.customerName}`, debit: arAmount, credit: 0 },
      ...Array.from(withholdingTax.values()).filter((t) => t.amount > 0).map((t) => ({ tenantId, entryId: je!.id, accountId: t.accountId, description: `${t.name} (dipotong pelanggan)`, debit: t.amount, credit: 0 })),
      ...revAccum.filter((r) => r.amount > 0).map((r) => ({ tenantId, entryId: je!.id, accountId: r.accountId, description: r.description, debit: 0, credit: r.amount })),
      ...Array.from(regularTax.values()).filter((t) => t.amount > 0).map((t) => ({ tenantId, entryId: je!.id, accountId: t.accountId, description: t.name, debit: 0, credit: t.amount })),
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

    const taxMap = await loadBillLineTaxMap(tx, tenantId, lines.map((l) => l.id))

    type ExpAccum = { accountId: string; description: string; amount: number }
    const expAccum: ExpAccum[] = []
    const regularTax = new Map<string, { accountId: string; name: string; amount: number }>()
    const withholdingTax = new Map<string, { accountId: string; name: string; amount: number }>()
    let grandTotal = 0
    let withholdingTotal = 0
    for (const l of lines) {
      const subtotal = l.quantity * l.unitPrice
      const comp = computeLineTaxes(subtotal, taxMap.get(l.id) ?? [])
      expAccum.push({ accountId: l.accountId, description: l.description, amount: comp.baseAmount })
      grandTotal += comp.total
      for (const t of comp.taxes) {
        const bucket = t.isWithholding ? withholdingTax : regularTax
        if (t.isWithholding) withholdingTotal += t.amount
        const cur = bucket.get(t.taxAccountId)
        if (cur) cur.amount += t.amount
        else bucket.set(t.taxAccountId, { accountId: t.taxAccountId, name: t.taxName, amount: t.amount })
      }
    }

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

    // Purchase-side withholding: we withhold from vendor → record as payable to govt (Cr).
    // AP credit = grandTotal - withholdingTotal (what we owe the vendor net of withholding).
    const apAmount = grandTotal - withholdingTotal
    const jelRows: { tenantId: string; entryId: string; accountId: string; description: string; debit: number; credit: number }[] = [
      ...expAccum.filter((r) => r.amount > 0).map((r) => ({ tenantId, entryId: je!.id, accountId: r.accountId, description: r.description, debit: r.amount, credit: 0 })),
      ...Array.from(regularTax.values()).filter((t) => t.amount > 0).map((t) => ({ tenantId, entryId: je!.id, accountId: t.accountId, description: t.name, debit: t.amount, credit: 0 })),
      ...Array.from(withholdingTax.values()).filter((t) => t.amount > 0).map((t) => ({ tenantId, entryId: je!.id, accountId: t.accountId, description: `${t.name} (potong vendor)`, debit: 0, credit: t.amount })),
      { tenantId, entryId: je!.id, accountId: ap.id, description: `Utang ke ${bill.vendorName}`, debit: 0, credit: apAmount },
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

    const breakdown = await getInvoiceTaxBreakdown(tenantId, invoiceId)
    const total = breakdown.netSettlement // amount actually received (gross minus withholding)

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

    const breakdown = await getBillTaxBreakdown(tenantId, billId)
    const total = breakdown.netSettlement // amount actually paid to vendor (gross minus withholding)

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

// ── Tax computation ───────────────────────────────────────────────────────────

export interface ComputedLineTax {
  taxId: string
  taxName: string
  taxAccountId: string
  groupId: string | null
  amount: number // IDR amount on this line
  isWithholding: boolean
}

export interface ComputedLine {
  lineId: string
  baseAmount: number
  taxes: ComputedLineTax[]
  total: number // baseAmount + exclusive_regular (withholding NOT added)
}

interface InputTax {
  id: string
  name: string
  amount: number // basis points (percent) or IDR (fixed)
  amountType: 'percent' | 'fixed'
  taxAccountId: string
  groupId: string | null
  priceInclude: boolean
  isWithholding: boolean
}

/**
 * Apply taxes to a line subtotal (qty * unit_price).
 *
 * Indonesian convention is single-tax-per-line in most cases; if multiple taxes
 * apply, they are computed independently against the same base.  Price-included
 * taxes are deducted from base; exclusive taxes are added on top.
 */
export function computeLineTaxes(subtotal: number, applied: InputTax[]): { baseAmount: number; taxes: { taxId: string; taxName: string; taxAccountId: string; groupId: string | null; amount: number; isWithholding: boolean }[]; total: number } {
  // Withholding taxes are never price-included; they don't change the gross.
  let base = subtotal
  const nonWithholding = applied.filter((t) => !t.isWithholding)
  const inclusivePercent = nonWithholding.filter((t) => t.priceInclude && t.amountType === 'percent')
  const inclusiveFixed   = nonWithholding.filter((t) => t.priceInclude && t.amountType === 'fixed')
  const inclusiveFixedTotal = inclusiveFixed.reduce((s, t) => s + t.amount, 0)
  const inclusiveRate = inclusivePercent.reduce((s, t) => s + t.amount / 10000, 0)
  if (inclusiveRate > 0 || inclusiveFixedTotal > 0) {
    base = Math.round((subtotal - inclusiveFixedTotal) / (1 + inclusiveRate))
    if (base < 0) base = 0
  }

  const computed: { taxId: string; taxName: string; taxAccountId: string; groupId: string | null; amount: number; isWithholding: boolean }[] = []
  let exclusiveTotal = 0
  for (const t of applied) {
    let amount = 0
    if (t.priceInclude && !t.isWithholding) {
      if (t.amountType === 'percent') amount = Math.round(base * (t.amount / 10000))
      else amount = t.amount
    } else {
      if (t.amountType === 'percent') amount = Math.round(base * (t.amount / 10000))
      else amount = t.amount
      if (!t.isWithholding) exclusiveTotal += amount
    }
    computed.push({ taxId: t.id, taxName: t.name, taxAccountId: t.taxAccountId, groupId: t.groupId, amount, isWithholding: t.isWithholding })
  }

  return { baseAmount: base, taxes: computed, total: base + exclusiveTotal }
}

// ── Tax CRUD ──────────────────────────────────────────────────────────────────

export async function listTaxGroups(tenantId: string): Promise<TaxGroup[]> {
  return withTenant(tenantId, async (tx) => {
    return tx
      .select()
      .from(taxGroups)
      .where(eq(taxGroups.tenantId, tenantId))
      .orderBy(asc(taxGroups.sequence), asc(taxGroups.name))
  })
}

export async function listTaxes(tenantId: string, opts: { scope?: 'sale' | 'purchase'; activeOnly?: boolean } = {}): Promise<(Tax & { groupName: string | null; accountCode: string; accountName: string })[]> {
  return withTenant(tenantId, async (tx) => {
    const where = [eq(taxes.tenantId, tenantId)]
    if (opts.scope) where.push(eq(taxes.scope, opts.scope))
    if (opts.activeOnly) where.push(eq(taxes.isActive, true))
    const rows = await tx
      .select({
        tax: taxes,
        groupName: taxGroups.name,
        accountCode: accounts.code,
        accountName: accounts.name,
      })
      .from(taxes)
      .leftJoin(taxGroups, eq(taxes.groupId, taxGroups.id))
      .innerJoin(accounts, eq(taxes.taxAccountId, accounts.id))
      .where(and(...where))
      .orderBy(asc(taxes.sequence), asc(taxes.name))
    return rows.map((r) => ({ ...r.tax, groupName: r.groupName, accountCode: r.accountCode, accountName: r.accountName }))
  })
}

export async function createTaxGroup(input: { tenantId: string; name: string; sequence?: number }): Promise<TaxGroup> {
  return withTenant(input.tenantId, async (tx) => {
    const [g] = await tx.insert(taxGroups).values({
      tenantId: input.tenantId,
      name: input.name,
      sequence: input.sequence ?? 10,
    }).returning()
    return g!
  })
}

export async function createTax(input: {
  tenantId: string
  name: string
  scope: 'sale' | 'purchase'
  amountType?: 'percent' | 'fixed'
  amount: number
  taxAccountId: string
  groupId?: string | null
  priceInclude?: boolean
  isWithholding?: boolean
  sequence?: number
  description?: string | null
}): Promise<Tax> {
  return withTenant(input.tenantId, async (tx) => {
    const [t] = await tx.insert(taxes).values({
      tenantId: input.tenantId,
      name: input.name,
      scope: input.scope,
      amountType: input.amountType ?? 'percent',
      amount: input.amount,
      taxAccountId: input.taxAccountId,
      groupId: input.groupId ?? null,
      priceInclude: input.priceInclude ?? false,
      isWithholding: input.isWithholding ?? false,
      sequence: input.sequence ?? 10,
      description: input.description ?? null,
    }).returning()
    return t!
  })
}

/**
 * Idempotent: seeds Indonesian default tax groups + taxes for a tenant.
 * Requires CoA accounts 2200, 1220, 2220 — call seedDefaultAccounts() first.
 */
export async function seedDefaultTaxes(tenantId: string): Promise<{ groups: number; taxes: number }> {
  return withTenant(tenantId, async (tx) => {
    // Ensure required accounts exist
    const acct = (code: string) => tx.select().from(accounts).where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, code))).limit(1)
    const [out] = await acct('2200') // PPN Keluaran
    const [inn] = await acct('1220') // PPN Masukan
    const [p23p] = await acct('2220') // Utang PPh 23 (withhold from vendor)
    const [p23r] = await acct('1230') // PPh 23 Dibayar di Muka (withheld by customer)
    if (!out || !inn) return { groups: 0, taxes: 0 }

    // Groups
    const existingGroups = await tx.select().from(taxGroups).where(eq(taxGroups.tenantId, tenantId))
    const groupByName = new Map(existingGroups.map((g) => [g.name, g]))
    const wantGroups: { name: string; sequence: number }[] = [
      { name: 'PPN', sequence: 1 },
      { name: 'PPh', sequence: 2 },
    ]
    let groupsAdded = 0
    for (const g of wantGroups) {
      if (!groupByName.has(g.name)) {
        const [created] = await tx.insert(taxGroups).values({ tenantId, name: g.name, sequence: g.sequence }).returning()
        if (created) {
          groupByName.set(g.name, created)
          groupsAdded++
        }
      }
    }

    // Taxes
    const existingTaxes = await tx.select().from(taxes).where(eq(taxes.tenantId, tenantId))
    const taxByName = new Set(existingTaxes.map((t) => t.name))
    const ppn = groupByName.get('PPN')!
    const pph = groupByName.get('PPh')!
    const wantTaxes: Array<typeof taxes.$inferInsert> = [
      { tenantId, name: 'PPN 11% (Penjualan)',  scope: 'sale',     amountType: 'percent', amount: 1100, taxAccountId: out.id, groupId: ppn.id, priceInclude: false, isWithholding: false, sequence: 1, description: 'PPN Keluaran 11% (tarif standar 2026).' },
      { tenantId, name: 'PPN 11% (Pembelian)',  scope: 'purchase', amountType: 'percent', amount: 1100, taxAccountId: inn.id, groupId: ppn.id, priceInclude: false, isWithholding: false, sequence: 2, description: 'PPN Masukan 11% (kredit pajak).' },
    ]
    if (p23p) {
      wantTaxes.push({ tenantId, name: 'PPh 23 2% (Potong Vendor)', scope: 'purchase', amountType: 'percent', amount: 200, taxAccountId: p23p.id, groupId: pph.id, priceInclude: false, isWithholding: true, sequence: 3, description: 'PPh 23 atas jasa — dipotong dari pembayaran vendor (2%).' })
    }
    if (p23r) {
      wantTaxes.push({ tenantId, name: 'PPh 23 2% (Dipotong Pelanggan)', scope: 'sale', amountType: 'percent', amount: 200, taxAccountId: p23r.id, groupId: pph.id, priceInclude: false, isWithholding: true, sequence: 4, description: 'PPh 23 yang dipotong pelanggan dari pembayaran ke kami (kredit pajak).' })
    }
    let added = 0
    for (const t of wantTaxes) {
      if (!taxByName.has(t.name)) {
        await tx.insert(taxes).values(t)
        added++
      }
    }
    return { groups: groupsAdded, taxes: added }
  })
}

// ── Per-line tax wiring ───────────────────────────────────────────────────────

export async function setInvoiceLineTaxes(tenantId: string, invoiceLineId: string, taxIds: string[]): Promise<void> {
  return withTenant(tenantId, async (tx) => {
    await tx.delete(invoiceLineTaxes).where(and(eq(invoiceLineTaxes.tenantId, tenantId), eq(invoiceLineTaxes.invoiceLineId, invoiceLineId)))
    if (taxIds.length > 0) {
      await tx.insert(invoiceLineTaxes).values(taxIds.map((tid) => ({ tenantId, invoiceLineId, taxId: tid })))
    }
  })
}

export async function setBillLineTaxes(tenantId: string, billLineId: string, taxIds: string[]): Promise<void> {
  return withTenant(tenantId, async (tx) => {
    await tx.delete(billLineTaxes).where(and(eq(billLineTaxes.tenantId, tenantId), eq(billLineTaxes.billLineId, billLineId)))
    if (taxIds.length > 0) {
      await tx.insert(billLineTaxes).values(taxIds.map((tid) => ({ tenantId, billLineId, taxId: tid })))
    }
  })
}

// Helpers used by confirm-* flows.
async function loadInvoiceLineTaxMap(tx: Parameters<Parameters<typeof withTenant>[1]>[0], tenantId: string, lineIds: string[]): Promise<Map<string, InputTax[]>> {
  if (lineIds.length === 0) return new Map()
  const rows = await tx
    .select({
      lineId: invoiceLineTaxes.invoiceLineId,
      id: taxes.id,
      name: taxes.name,
      amount: taxes.amount,
      amountType: taxes.amountType,
      taxAccountId: taxes.taxAccountId,
      groupId: taxes.groupId,
      priceInclude: taxes.priceInclude,
      isWithholding: taxes.isWithholding,
    })
    .from(invoiceLineTaxes)
    .innerJoin(taxes, eq(invoiceLineTaxes.taxId, taxes.id))
    .where(and(eq(invoiceLineTaxes.tenantId, tenantId), inArray(invoiceLineTaxes.invoiceLineId, lineIds)))
  const out = new Map<string, InputTax[]>()
  for (const r of rows) {
    const arr = out.get(r.lineId) ?? []
    arr.push({ id: r.id, name: r.name, amount: r.amount, amountType: r.amountType as 'percent' | 'fixed', taxAccountId: r.taxAccountId, groupId: r.groupId, priceInclude: r.priceInclude, isWithholding: r.isWithholding })
    out.set(r.lineId, arr)
  }
  return out
}

async function loadBillLineTaxMap(tx: Parameters<Parameters<typeof withTenant>[1]>[0], tenantId: string, lineIds: string[]): Promise<Map<string, InputTax[]>> {
  if (lineIds.length === 0) return new Map()
  const rows = await tx
    .select({
      lineId: billLineTaxes.billLineId,
      id: taxes.id,
      name: taxes.name,
      amount: taxes.amount,
      amountType: taxes.amountType,
      taxAccountId: taxes.taxAccountId,
      groupId: taxes.groupId,
      priceInclude: taxes.priceInclude,
      isWithholding: taxes.isWithholding,
    })
    .from(billLineTaxes)
    .innerJoin(taxes, eq(billLineTaxes.taxId, taxes.id))
    .where(and(eq(billLineTaxes.tenantId, tenantId), inArray(billLineTaxes.billLineId, lineIds)))
  const out = new Map<string, InputTax[]>()
  for (const r of rows) {
    const arr = out.get(r.lineId) ?? []
    arr.push({ id: r.id, name: r.name, amount: r.amount, amountType: r.amountType as 'percent' | 'fixed', taxAccountId: r.taxAccountId, groupId: r.groupId, priceInclude: r.priceInclude, isWithholding: r.isWithholding })
    out.set(r.lineId, arr)
  }
  return out
}

export interface TaxBreakdown {
  baseTotal: number
  taxLines: { taxId: string; taxName: string; taxAccountId: string; groupId: string | null; amount: number; isWithholding: boolean }[]
  taxByGroup: { groupId: string | null; groupName: string | null; amount: number }[]
  grandTotal: number          // base + non-withholding exclusive taxes (invoice/bill face value)
  withholdingTotal: number    // sum of withholding taxes (reduces cash settlement)
  netSettlement: number       // grandTotal - withholdingTotal (actual cash leg)
}

/** Compute the full breakdown of an invoice (used by detail view + posting). */
export async function getInvoiceTaxBreakdown(tenantId: string, invoiceId: string): Promise<TaxBreakdown> {
  return withTenant(tenantId, async (tx) => {
    const lines = await tx.select().from(invoiceLines)
      .where(and(eq(invoiceLines.tenantId, tenantId), eq(invoiceLines.invoiceId, invoiceId)))
    const taxMap = await loadInvoiceLineTaxMap(tx, tenantId, lines.map((l) => l.id))
    return aggregate(lines.map((l) => ({ id: l.id, subtotal: l.quantity * l.unitPrice, taxes: taxMap.get(l.id) ?? [] })), tx, tenantId)
  })
}

export async function getBillTaxBreakdown(tenantId: string, billId: string): Promise<TaxBreakdown> {
  return withTenant(tenantId, async (tx) => {
    const lines = await tx.select().from(billLines)
      .where(and(eq(billLines.tenantId, tenantId), eq(billLines.billId, billId)))
    const taxMap = await loadBillLineTaxMap(tx, tenantId, lines.map((l) => l.id))
    return aggregate(lines.map((l) => ({ id: l.id, subtotal: l.quantity * l.unitPrice, taxes: taxMap.get(l.id) ?? [] })), tx, tenantId)
  })
}

async function aggregate(
  lines: { id: string; subtotal: number; taxes: InputTax[] }[],
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
): Promise<TaxBreakdown> {
  let baseTotal = 0
  let grandTotal = 0
  let withholdingTotal = 0
  const taxAccum = new Map<string, { taxId: string; taxName: string; taxAccountId: string; groupId: string | null; amount: number; isWithholding: boolean }>()
  for (const l of lines) {
    const comp = computeLineTaxes(l.subtotal, l.taxes)
    baseTotal += comp.baseAmount
    grandTotal += comp.total
    for (const t of comp.taxes) {
      if (t.isWithholding) withholdingTotal += t.amount
      const cur = taxAccum.get(t.taxId)
      if (cur) cur.amount += t.amount
      else taxAccum.set(t.taxId, { ...t })
    }
  }
  const taxLines = Array.from(taxAccum.values())

  // Group lookup (withholding contributes negative-direction; tracked separately via tax flag)
  const groupIds = Array.from(new Set(taxLines.map((t) => t.groupId).filter((g): g is string => !!g)))
  const groups = groupIds.length
    ? await tx.select().from(taxGroups).where(and(eq(taxGroups.tenantId, tenantId), inArray(taxGroups.id, groupIds)))
    : []
  const groupName = new Map(groups.map((g) => [g.id, g.name]))
  const groupAccum = new Map<string, { groupId: string | null; groupName: string | null; amount: number }>()
  for (const t of taxLines) {
    if (t.isWithholding) continue
    const key = t.groupId ?? '__none__'
    const cur = groupAccum.get(key)
    if (cur) cur.amount += t.amount
    else groupAccum.set(key, { groupId: t.groupId, groupName: t.groupId ? groupName.get(t.groupId) ?? null : null, amount: t.amount })
  }
  return { baseTotal, taxLines, taxByGroup: Array.from(groupAccum.values()), grandTotal, withholdingTotal, netSettlement: grandTotal - withholdingTotal }
}
