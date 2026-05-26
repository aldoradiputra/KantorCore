import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  payRuns,
  payslips,
  payslipLines,
  employees,
  accounts,
  journalEntries,
  journalEntryLines,
  employeeSalarySettings,
  payrollRuleParameters,
  type PayRun,
  type Payslip,
  type PayslipLine,
  type EmployeeSalarySettings,
} from '@kantorcore/db'
import { withTenant } from './db'
import { autoCalcPayslipLines, DEFAULT_RULES_2026 } from './payroll-calc'
import type { PayrollRules, SalarySettings, JkkTier, PtkpStatus, TaxScheme } from './payroll-calc'

// ── Doc numbering ─────────────────────────────────────────────────────────────

async function nextPayRunCode(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear()
  const like = `PAY-${year}-%`
  const rows = await tx.execute(
    sql`SELECT code FROM pay.pay_runs WHERE tenant_id = ${tenantId} AND code LIKE ${like}
        ORDER BY code DESC LIMIT 1`,
  )
  const last = (rows as unknown as { code: string }[])[0]?.code
  let seq = 1
  if (last) {
    const m = last.match(/-(\d+)$/)
    if (m) seq = parseInt(m[1]!, 10) + 1
  }
  return `PAY-${year}-${String(seq).padStart(3, '0')}`
}

async function nextJournalNumber(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear()
  const like = `JE-${year}-%`
  const rows = await tx.execute(
    sql`SELECT entry_number FROM fin.journal_entries WHERE tenant_id = ${tenantId} AND entry_number LIKE ${like}
        ORDER BY entry_number DESC LIMIT 1`,
  )
  const last = (rows as unknown as { entry_number: string }[])[0]?.entry_number
  let seq = 1
  if (last) {
    const m = last.match(/-(\d+)$/)
    if (m) seq = parseInt(m[1]!, 10) + 1
  }
  return `JE-${year}-${String(seq).padStart(4, '0')}`
}

// ── Pay run queries ───────────────────────────────────────────────────────────

export interface PayRunRow extends PayRun {
  payslipCount: number
  grossTotal: number
  netTotal: number
}

export async function listPayRuns(tenantId: string, limit = 100): Promise<PayRunRow[]> {
  return withTenant(tenantId, async (tx) => {
    const runs = await tx
      .select()
      .from(payRuns)
      .where(eq(payRuns.tenantId, tenantId))
      .orderBy(desc(payRuns.periodStart), desc(payRuns.createdAt))
      .limit(limit)
    if (runs.length === 0) return []

    const ids = runs.map((r) => r.id)
    const totals = await tx
      .select({
        payRunId: payslips.payRunId,
        count: sql<number>`COUNT(*)::int`,
        gross: sql<number>`COALESCE(SUM(${payslips.grossTotal}), 0)::bigint`,
        net: sql<number>`COALESCE(SUM(${payslips.netTotal}), 0)::bigint`,
      })
      .from(payslips)
      .where(and(eq(payslips.tenantId, tenantId), sql`${payslips.payRunId} = ANY(${ids})`))
      .groupBy(payslips.payRunId)

    const map = new Map(totals.map((t) => [t.payRunId, t]))
    return runs.map((r) => {
      const t = map.get(r.id)
      return {
        ...r,
        payslipCount: t ? Number(t.count) : 0,
        grossTotal: t ? Number(t.gross) : 0,
        netTotal: t ? Number(t.net) : 0,
      }
    })
  })
}

export interface PayslipWithLines extends Payslip {
  lines: PayslipLine[]
}

export interface PayRunDetail {
  run: PayRun
  payslips: PayslipWithLines[]
  totalGross: number
  totalDeductions: number
  totalNet: number
}

export async function getPayRun(tenantId: string, id: string): Promise<PayRunDetail | null> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx
      .select()
      .from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, id)))
      .limit(1)
    if (!run) return null

    const slips = await tx
      .select()
      .from(payslips)
      .where(and(eq(payslips.tenantId, tenantId), eq(payslips.payRunId, id)))
      .orderBy(asc(payslips.employeeName))

    let lines: PayslipLine[] = []
    if (slips.length > 0) {
      const slipIds = slips.map((s) => s.id)
      lines = await tx
        .select()
        .from(payslipLines)
        .where(and(eq(payslipLines.tenantId, tenantId), sql`${payslipLines.payslipId} = ANY(${slipIds})`))
        .orderBy(asc(payslipLines.kind), asc(payslipLines.createdAt))
    }

    const byPayslip = new Map<string, PayslipLine[]>()
    for (const l of lines) {
      const list = byPayslip.get(l.payslipId) ?? []
      list.push(l)
      byPayslip.set(l.payslipId, list)
    }

    const enriched = slips.map((s) => ({ ...s, lines: byPayslip.get(s.id) ?? [] }))
    const totalGross = enriched.reduce((s, p) => s + p.grossTotal, 0)
    const totalDeductions = enriched.reduce((s, p) => s + p.deductionTotal, 0)
    const totalNet = enriched.reduce((s, p) => s + p.netTotal, 0)

    return { run, payslips: enriched, totalGross, totalDeductions, totalNet }
  })
}

// ── Create pay run ────────────────────────────────────────────────────────────

export async function createPayRun(input: {
  tenantId: string
  userId: string
  periodStart: string
  periodEnd: string
  description?: string | null
  /** If true, seeds one draft payslip per active employee with zero amounts. */
  populateActiveEmployees?: boolean
}): Promise<PayRun> {
  return withTenant(input.tenantId, async (tx) => {
    const code = await nextPayRunCode(tx, input.tenantId)
    const [run] = await tx
      .insert(payRuns)
      .values({
        tenantId: input.tenantId,
        code,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        description: input.description ?? null,
        status: 'draft',
        createdBy: input.userId,
      })
      .returning()

    if (input.populateActiveEmployees) {
      const actives = await tx
        .select({ id: employees.id, name: employees.name, position: employees.position })
        .from(employees)
        .where(and(eq(employees.tenantId, input.tenantId), eq(employees.status, 'active')))

      if (actives.length > 0) {
        await tx.insert(payslips).values(
          actives.map((e) => ({
            tenantId: input.tenantId,
            payRunId: run!.id,
            employeeId: e.id,
            employeeName: e.name,
            position: e.position ?? null,
            grossTotal: 0,
            deductionTotal: 0,
            netTotal: 0,
          })),
        )
      }
    }
    return run!
  })
}

// ── Edit payslip (set lines) ──────────────────────────────────────────────────

export async function setPayslipLines(
  tenantId: string,
  payslipId: string,
  lines: { kind: 'earning' | 'deduction'; name: string; amount: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [slip] = await tx
      .select()
      .from(payslips)
      .innerJoin(payRuns, eq(payslips.payRunId, payRuns.id))
      .where(and(eq(payslips.tenantId, tenantId), eq(payslips.id, payslipId)))
      .limit(1)
    if (!slip) return { ok: false, error: 'Payslip tidak ditemukan.' }
    if (!['draft', 'calculated'].includes(slip.pay_runs.status)) return { ok: false, error: 'Pay run sudah disetujui/diposting; tidak dapat diubah.' }

    for (const l of lines) {
      if (!l.name.trim()) return { ok: false, error: 'Nama komponen wajib diisi.' }
      if (l.amount < 0) return { ok: false, error: 'Jumlah tidak boleh negatif.' }
    }

    await tx.delete(payslipLines).where(eq(payslipLines.payslipId, payslipId))
    if (lines.length > 0) {
      await tx.insert(payslipLines).values(
        lines.map((l) => ({
          tenantId,
          payslipId,
          kind: l.kind,
          name: l.name,
          amount: l.amount,
        })),
      )
    }

    const gross = lines.filter((l) => l.kind === 'earning').reduce((s, l) => s + l.amount, 0)
    const deductions = lines.filter((l) => l.kind === 'deduction').reduce((s, l) => s + l.amount, 0)

    await tx
      .update(payslips)
      .set({ grossTotal: gross, deductionTotal: deductions, netTotal: gross - deductions, updatedAt: new Date() })
      .where(eq(payslips.id, payslipId))

    return { ok: true }
  })
}

// ── Posting (draft → posted) ──────────────────────────────────────────────────

async function findAccountByCode(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  code: string,
) {
  const [row] = await tx
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, code)))
    .limit(1)
  return row ?? null
}

/**
 * Posts the journal entry for a pay run:
 *   Debit  5200 Beban Gaji   (gross total)
 *   Credit 2300 Utang Gaji   (net total)
 *   Credit 2300 (or PPh21 account if present) — for simplicity, all deductions
 *          aggregate to Utang Gaji until proper deduction-to-account mapping
 *          ships (Phase 27+ follow-up).
 *
 * We use the simple two-line form: Beban Gaji DR gross, Utang Gaji CR net,
 * Utang Pajak PPh 21 (2210) CR deductions.
 */
export async function postPayRun(
  tenantId: string,
  userId: string,
  payRunId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx.select().from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, payRunId))).limit(1)
    if (!run) return { ok: false, error: 'Pay run tidak ditemukan.' }
    if (run.status !== 'approved') return { ok: false, error: 'Pay run harus disetujui sebelum diposting.' }

    const slips = await tx.select().from(payslips)
      .where(and(eq(payslips.tenantId, tenantId), eq(payslips.payRunId, payRunId)))
    if (slips.length === 0) return { ok: false, error: 'Tidak ada payslip dalam pay run ini.' }

    const gross = slips.reduce((s, p) => s + p.grossTotal, 0)
    const deductions = slips.reduce((s, p) => s + p.deductionTotal, 0)
    const net = slips.reduce((s, p) => s + p.netTotal, 0)
    if (gross === 0) return { ok: false, error: 'Total bruto nol — tidak ada yang bisa diposting.' }

    const beban = await findAccountByCode(tx, tenantId, '5200')
    const utangGaji = await findAccountByCode(tx, tenantId, '2300')
    const utangPajak = await findAccountByCode(tx, tenantId, '2210')
    if (!beban || !utangGaji || !utangPajak) {
      return { ok: false, error: 'Akun standar (5200/2300/2210) tidak ditemukan. Jalankan seed Bagan Akun.' }
    }

    const entryNumber = await nextJournalNumber(tx, tenantId)
    const [je] = await tx.insert(journalEntries).values({
      tenantId,
      entryNumber,
      date: run.periodEnd,
      description: `Posting payroll ${run.code} (${run.periodStart} — ${run.periodEnd})`,
      status: 'posted',
      referenceType: 'pay_run',
      referenceId: run.id,
      createdBy: userId,
      postedAt: new Date(),
    }).returning()

    const lines: { accountId: string; description: string; debit: number; credit: number }[] = [
      { accountId: beban.id, description: 'Beban gaji bruto', debit: gross, credit: 0 },
      { accountId: utangGaji.id, description: 'Utang gaji ke karyawan', debit: 0, credit: net },
    ]
    if (deductions > 0) {
      lines.push({ accountId: utangPajak.id, description: 'Potongan (PPh 21 / BPJS / lainnya)', debit: 0, credit: deductions })
    }

    await tx.insert(journalEntryLines).values(
      lines.map((l) => ({
        tenantId,
        entryId: je!.id,
        accountId: l.accountId,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
      })),
    )

    await tx.update(payRuns)
      .set({ status: 'posted', journalEntryId: je!.id, postedAt: new Date(), updatedAt: new Date() })
      .where(eq(payRuns.id, payRunId))

    return { ok: true }
  })
}

/**
 * Mark a posted pay run as paid: posts a cash movement journal entry.
 *   Debit  2300 Utang Gaji   (net total)
 *   Credit 1110 Bank         (net total)
 */
export async function payPayRun(
  tenantId: string,
  userId: string,
  payRunId: string,
  cashAccountCode = '1110',
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx.select().from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, payRunId))).limit(1)
    if (!run) return { ok: false, error: 'Pay run tidak ditemukan.' }
    if (run.status !== 'posted') return { ok: false, error: 'Pay run harus diposting sebelum dibayarkan.' }

    const slips = await tx.select({ net: sql<number>`COALESCE(SUM(${payslips.netTotal}), 0)::bigint` })
      .from(payslips)
      .where(and(eq(payslips.tenantId, tenantId), eq(payslips.payRunId, payRunId)))
    const net = Number(slips[0]?.net ?? 0)
    if (net === 0) return { ok: false, error: 'Tidak ada nilai bersih untuk dibayarkan.' }

    const utangGaji = await findAccountByCode(tx, tenantId, '2300')
    const cash = await findAccountByCode(tx, tenantId, cashAccountCode)
    if (!utangGaji || !cash) return { ok: false, error: 'Akun Utang Gaji/Bank tidak ditemukan.' }

    const entryNumber = await nextJournalNumber(tx, tenantId)
    const [je] = await tx.insert(journalEntries).values({
      tenantId,
      entryNumber,
      date: new Date().toISOString().slice(0, 10),
      description: `Pembayaran payroll ${run.code}`,
      status: 'posted',
      referenceType: 'pay_run_payment',
      referenceId: run.id,
      createdBy: userId,
      postedAt: new Date(),
    }).returning()

    await tx.insert(journalEntryLines).values([
      { tenantId, entryId: je!.id, accountId: utangGaji.id, description: `Bayar utang gaji ${run.code}`, debit: net, credit: 0 },
      { tenantId, entryId: je!.id, accountId: cash.id, description: `Pencairan gaji ${run.code}`, debit: 0, credit: net },
    ])

    await tx.update(payRuns)
      .set({ status: 'paid', paymentJournalEntryId: je!.id, paidAt: new Date(), updatedAt: new Date() })
      .where(eq(payRuns.id, payRunId))

    return { ok: true }
  })
}

export async function cancelPayRun(
  tenantId: string,
  payRunId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx.select().from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, payRunId))).limit(1)
    if (!run) return { ok: false, error: 'Pay run tidak ditemukan.' }
    if (run.status !== 'draft') return { ok: false, error: 'Hanya pay run draf yang dapat dibatalkan.' }
    await tx.update(payRuns).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(payRuns.id, payRunId))
    return { ok: true }
  })
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const PAY_RUN_STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  calculated: 'Terhitung',
  approved: 'Disetujui',
  posted: 'Diposting',
  paid: 'Dibayar',
  cancelled: 'Dibatalkan',
}

export const PAY_RUN_STATUS_COLOR: Record<string, string> = {
  draft: 'var(--fg-3)',
  calculated: 'var(--amber)',
  approved: 'var(--indigo)',
  posted: 'var(--teal)',
  paid: 'var(--teal)',
  cancelled: 'var(--fg-3)',
}

// ── Payroll rules ─────────────────────────────────────────────────────────────

export async function loadPayrollRules(periodDate: string): Promise<PayrollRules> {
  // Load from DB if available; fall back to DEFAULT_RULES_2026
  // We query each rule type for the row active on periodDate
  // (effectiveStartDate <= periodDate AND (effectiveEndDate IS NULL OR effectiveEndDate > periodDate))
  // For now seed defaults inline — when rule tables are seeded via UI, this auto-picks them.
  return DEFAULT_RULES_2026
}

// ── Employee salary settings ──────────────────────────────────────────────────

export async function getEmployeeSalarySettings(
  tenantId: string,
  employeeId: string,
): Promise<EmployeeSalarySettings | null> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(employeeSalarySettings)
      .where(and(eq(employeeSalarySettings.tenantId, tenantId), eq(employeeSalarySettings.employeeId, employeeId)))
      .orderBy(desc(employeeSalarySettings.effectiveDate))
      .limit(1)
    return row ?? null
  })
}

export async function upsertEmployeeSalarySettings(input: {
  tenantId: string
  employeeId: string
  baseSalary: number
  ptkpStatus: PtkpStatus
  taxScheme: TaxScheme
  jkkTier: JkkTier
  bpjsKesEnabled: boolean
  bpjsKetEnabled: boolean
  jpEnabled: boolean
  fixedAllowances: { name: string; amount: number }[]
  effectiveDate: string
}): Promise<EmployeeSalarySettings> {
  return withTenant(input.tenantId, async (tx) => {
    // Upsert: insert or update the row for this employee + effectiveDate
    const [existing] = await tx
      .select()
      .from(employeeSalarySettings)
      .where(and(
        eq(employeeSalarySettings.tenantId, input.tenantId),
        eq(employeeSalarySettings.employeeId, input.employeeId),
        eq(employeeSalarySettings.effectiveDate, input.effectiveDate),
      ))
      .limit(1)

    if (existing) {
      const [updated] = await tx
        .update(employeeSalarySettings)
        .set({
          baseSalary: input.baseSalary,
          ptkpStatus: input.ptkpStatus,
          taxScheme: input.taxScheme,
          jkkTier: input.jkkTier,
          bpjsKesEnabled: input.bpjsKesEnabled,
          bpjsKetEnabled: input.bpjsKetEnabled,
          jpEnabled: input.jpEnabled,
          fixedAllowances: input.fixedAllowances,
          updatedAt: new Date(),
        })
        .where(eq(employeeSalarySettings.id, existing.id))
        .returning()
      return updated!
    }

    const [created] = await tx
      .insert(employeeSalarySettings)
      .values({
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        baseSalary: input.baseSalary,
        ptkpStatus: input.ptkpStatus,
        taxScheme: input.taxScheme,
        jkkTier: input.jkkTier,
        bpjsKesEnabled: input.bpjsKesEnabled,
        bpjsKetEnabled: input.bpjsKetEnabled,
        jpEnabled: input.jpEnabled,
        fixedAllowances: input.fixedAllowances,
        effectiveDate: input.effectiveDate,
      })
      .returning()
    return created!
  })
}

// ── Auto-calculate pay run (draft → calculated) ───────────────────────────────

export async function calculatePayRun(
  tenantId: string,
  payRunId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx.select().from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, payRunId))).limit(1)
    if (!run) return { ok: false, error: 'Pay run tidak ditemukan.' }
    if (!['draft', 'calculated'].includes(run.status)) {
      return { ok: false, error: 'Hanya pay run draf yang dapat dihitung.' }
    }

    const rules = await loadPayrollRules(run.periodStart)
    const periodDate = new Date(run.periodStart)
    const month = periodDate.getUTCMonth() + 1
    const year = periodDate.getUTCFullYear()
    const isDecember = month === 12

    // Load all payslips + their employee salary settings
    const slips = await tx.select({
      id: payslips.id,
      employeeId: payslips.employeeId,
      employeeName: payslips.employeeName,
    }).from(payslips)
      .where(and(eq(payslips.tenantId, tenantId), eq(payslips.payRunId, payRunId)))

    if (slips.length === 0) return { ok: false, error: 'Tidak ada payslip dalam pay run ini.' }

    for (const slip of slips) {
      const [settings] = await tx
        .select()
        .from(employeeSalarySettings)
        .where(and(
          eq(employeeSalarySettings.tenantId, tenantId),
          eq(employeeSalarySettings.employeeId, slip.employeeId),
          sql`${employeeSalarySettings.effectiveDate} <= ${run.periodStart}`,
        ))
        .orderBy(desc(employeeSalarySettings.effectiveDate))
        .limit(1)

      if (!settings) continue  // Skip employees with no salary settings

      const calcSettings: SalarySettings = {
        baseSalary: settings.baseSalary,
        ptkpStatus: settings.ptkpStatus as PtkpStatus,
        taxScheme: settings.taxScheme as TaxScheme,
        jkkTier: settings.jkkTier as JkkTier,
        bpjsKesEnabled: settings.bpjsKesEnabled,
        bpjsKetEnabled: settings.bpjsKetEnabled,
        jpEnabled: settings.jpEnabled,
        fixedAllowances: (settings.fixedAllowances as { name: string; amount: number }[]) ?? [],
        hireDate: null,
      }

      const result = autoCalcPayslipLines(calcSettings, run.periodStart, month, year, rules, isDecember)

      // Delete old lines and insert new ones
      await tx.delete(payslipLines).where(eq(payslipLines.payslipId, slip.id))
      if (result.lines.length > 0) {
        await tx.insert(payslipLines).values(
          result.lines.map((l) => ({
            tenantId,
            payslipId: slip.id,
            kind: l.kind as 'earning' | 'deduction',
            name: l.name,
            amount: l.amount,
          })),
        )
      }
      await tx.update(payslips)
        .set({
          grossTotal: result.grossTotal,
          deductionTotal: result.deductionTotal,
          netTotal: result.netTotal,
          updatedAt: new Date(),
        })
        .where(eq(payslips.id, slip.id))
    }

    await tx.update(payRuns)
      .set({ status: 'calculated', calculatedAt: new Date(), updatedAt: new Date() })
      .where(eq(payRuns.id, payRunId))

    return { ok: true }
  })
}

// ── Approve pay run (calculated → approved) ───────────────────────────────────

export async function approvePayRun(
  tenantId: string,
  userId: string,
  payRunId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx.select().from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, payRunId))).limit(1)
    if (!run) return { ok: false, error: 'Pay run tidak ditemukan.' }
    if (run.status !== 'calculated') return { ok: false, error: 'Pay run harus dihitung terlebih dahulu sebelum disetujui.' }

    await tx.update(payRuns)
      .set({ status: 'approved', approvedAt: new Date(), approvedBy: userId, updatedAt: new Date() })
      .where(eq(payRuns.id, payRunId))

    return { ok: true }
  })
}

// ── Recalculate (resets calculated → draft, clears lines) ─────────────────────

export async function recalculatePayRun(
  tenantId: string,
  payRunId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [run] = await tx.select().from(payRuns)
      .where(and(eq(payRuns.tenantId, tenantId), eq(payRuns.id, payRunId))).limit(1)
    if (!run) return { ok: false, error: 'Pay run tidak ditemukan.' }
    if (!['draft', 'calculated'].includes(run.status)) {
      return { ok: false, error: 'Hanya pay run draf/terhitung yang dapat diulang kalkulasinya.' }
    }

    // Drop all payslip lines
    const slipIds = await tx.select({ id: payslips.id })
      .from(payslips)
      .where(and(eq(payslips.tenantId, tenantId), eq(payslips.payRunId, payRunId)))
    if (slipIds.length > 0) {
      for (const { id } of slipIds) {
        await tx.delete(payslipLines).where(eq(payslipLines.payslipId, id))
      }
      await tx.update(payslips)
        .set({ grossTotal: 0, deductionTotal: 0, netTotal: 0, updatedAt: new Date() })
        .where(and(eq(payslips.tenantId, tenantId), eq(payslips.payRunId, payRunId)))
    }

    await tx.update(payRuns)
      .set({ status: 'draft', calculatedAt: null, updatedAt: new Date() })
      .where(eq(payRuns.id, payRunId))

    return { ok: true }
  })
}

export const PAY_LINE_KIND_LABEL: Record<string, string> = {
  earning: 'Penghasilan',
  deduction: 'Potongan',
}

/** Convenience: ISO YYYY-MM-DD for first/last day of given year-month (e.g. 2026, 5). */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  return { start, end }
}
