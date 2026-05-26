import 'server-only'
import { and, eq, gte, lte, sql, desc } from 'drizzle-orm'
import {
  bankStatements, statementRecords, journalEntries, journalEntryLines, accounts,
  type BankStatement, type StatementRecord,
} from '@kantorcore/db'
import { withTenant } from './db'

// ── Statement CRUD ────────────────────────────────────────────────────────────

export interface StatementWithRecords extends BankStatement {
  records: StatementRecord[]
  unreconciledCount: number
}

export async function listStatements(tenantId: string): Promise<BankStatement[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(bankStatements).where(eq(bankStatements.tenantId, tenantId)).orderBy(desc(bankStatements.createdAt))
  )
}

export async function getStatement(tenantId: string, id: string): Promise<StatementWithRecords | null> {
  return withTenant(tenantId, async (tx) => {
    const [stmt] = await tx.select().from(bankStatements).where(and(eq(bankStatements.tenantId, tenantId), eq(bankStatements.id, id))).limit(1)
    if (!stmt) return null
    const records = await tx.select().from(statementRecords).where(eq(statementRecords.statementId, id)).orderBy(sql`${statementRecords.date} ASC`)
    const unreconciledCount = records.filter((r) => !r.cleared).length
    return { ...stmt, records, unreconciledCount }
  })
}

export async function createStatement(input: {
  tenantId: string
  journalId: string
  accountNumber?: string
  startingBalance: number
  endingBalance: number
  dateFrom: string
  dateTo: string
  userId: string
  records: { date: string; amount: number; reference?: string; notes?: string }[]
}): Promise<{ ok: true; statementId: string } | { ok: false; error: string }> {
  // Integrity: starting_balance + sum(records) must equal ending_balance
  const recordSum = input.records.reduce((s, r) => s + r.amount, 0)
  const computed = input.startingBalance + recordSum
  if (Math.abs(computed - input.endingBalance) > 0.01) {
    return { ok: false, error: `Integrity check failed: ${input.startingBalance} + ${recordSum.toFixed(2)} = ${computed.toFixed(2)} ≠ ${input.endingBalance}` }
  }
  if (input.records.length === 0) return { ok: false, error: 'Statement must have at least one record.' }

  return withTenant(input.tenantId, async (tx) => {
    const [stmt] = await tx.insert(bankStatements).values({
      tenantId: input.tenantId,
      journalId: input.journalId,
      accountNumber: input.accountNumber ?? null,
      startingBalance: String(input.startingBalance),
      endingBalance: String(input.endingBalance),
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      status: 'processing',
      recordsCount: input.records.length,
      createdBy: input.userId,
    }).returning()

    await tx.insert(statementRecords).values(
      input.records.map((r) => ({
        tenantId: input.tenantId,
        statementId: stmt!.id,
        date: r.date,
        amount: String(r.amount),
        reference: r.reference ?? null,
        notes: r.notes ?? null,
        cleared: false,
      }))
    )
    return { ok: true, statementId: stmt!.id }
  })
}

// ── Match suggestion engine ───────────────────────────────────────────────────

export interface MatchSuggestion {
  journalEntryId: string
  entryNumber: string
  description: string
  date: string
  amount: number
  confidence: number   // 0–100
  matchReason: string
}

export async function suggestMatches(
  tenantId: string,
  recordId: string,
  opts: { tolerance?: number; matchLabel?: boolean; sameCurrency?: boolean } = {},
): Promise<MatchSuggestion[]> {
  return withTenant(tenantId, async (tx) => {
    const [record] = await tx.select().from(statementRecords).where(and(eq(statementRecords.tenantId, tenantId), eq(statementRecords.id, recordId))).limit(1)
    if (!record) return []

    const amount = Number(record.amount)
    const tolerance = opts.tolerance ?? 0
    const minAmt = amount - tolerance
    const maxAmt = amount + tolerance

    // Find journal entries with matching amount in lines
    const candidates = await tx
      .select({
        jeId: journalEntries.id,
        entryNumber: journalEntries.entryNumber,
        description: journalEntries.description,
        date: journalEntries.date,
        lineDebit: journalEntryLines.debit,
        lineCredit: journalEntryLines.credit,
      })
      .from(journalEntries)
      .innerJoin(journalEntryLines, eq(journalEntryLines.entryId, journalEntries.id))
      .where(and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, 'posted'),
        gte(journalEntryLines.debit, minAmt > 0 ? minAmt : 0),
        lte(journalEntryLines.debit, maxAmt > 0 ? maxAmt : 0),
      ))
      .limit(10)

    const suggestions: MatchSuggestion[] = []
    for (const c of candidates) {
      const lineAmt = Number(c.lineDebit) || Number(c.lineCredit)
      let confidence = 50
      const reasons: string[] = []

      // Amount match
      if (Math.abs(lineAmt - Math.abs(amount)) <= tolerance) { confidence += 30; reasons.push('amount match') }
      // Reference/label match
      if (opts.matchLabel && record.reference && c.description?.includes(record.reference)) { confidence += 20; reasons.push('reference match') }

      suggestions.push({
        journalEntryId: c.jeId,
        entryNumber: c.entryNumber,
        description: c.description ?? '',
        date: c.date,
        amount: lineAmt,
        confidence: Math.min(100, confidence),
        matchReason: reasons.join(', ') || 'amount proximity',
      })
    }
    return suggestions.sort((a, b) => b.confidence - a.confidence)
  })
}

// ── Reconcile a record ────────────────────────────────────────────────────────

export async function reconcileRecord(
  tenantId: string,
  recordId: string,
  journalEntryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [record] = await tx.select().from(statementRecords).where(and(eq(statementRecords.tenantId, tenantId), eq(statementRecords.id, recordId))).limit(1)
    if (!record) return { ok: false, error: 'Record tidak ditemukan.' }
    if (record.cleared) return { ok: false, error: 'Record sudah direkonsiliasi.' }

    await tx.update(statementRecords).set({ cleared: true, journalEntryId }).where(eq(statementRecords.id, recordId))

    // Check if all records in statement are now cleared → auto-advance to reconciled
    const allRecords = await tx.select({ cleared: statementRecords.cleared }).from(statementRecords).where(eq(statementRecords.statementId, record.statementId))
    if (allRecords.every((r) => r.cleared)) {
      await tx.update(bankStatements).set({ status: 'reconciled', reconciledAt: new Date(), updatedAt: new Date() }).where(eq(bankStatements.id, record.statementId))
    }
    return { ok: true }
  })
}

export async function unreconcileRecord(
  tenantId: string,
  recordId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [record] = await tx.select().from(statementRecords).where(and(eq(statementRecords.tenantId, tenantId), eq(statementRecords.id, recordId))).limit(1)
    if (!record) return { ok: false, error: 'Record tidak ditemukan.' }

    // Check statement is not fully reconciled (or allow unreconcile to revert it)
    await tx.update(statementRecords).set({ cleared: false, journalEntryId: null }).where(eq(statementRecords.id, recordId))
    // Revert statement to processing
    await tx.update(bankStatements).set({ status: 'processing', reconciledAt: null, updatedAt: new Date() }).where(eq(bankStatements.id, record.statementId))
    return { ok: true }
  })
}

export const STATEMENT_STATUS_LABEL: Record<string, string> = {
  draft: 'Draf', processing: 'Diproses', reconciled: 'Direkonsiliasi',
}
export const STATEMENT_STATUS_COLOR: Record<string, string> = {
  draft: 'var(--fg-3)', processing: 'var(--amber)', reconciled: 'var(--teal)',
}
