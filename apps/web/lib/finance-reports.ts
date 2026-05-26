import 'server-only'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { journalEntryLines, journalEntries, accounts } from '@kantorcore/db'
import { withTenant } from './db'

// ── Report layout types ───────────────────────────────────────────────────────

export interface ReportRowDef {
  id: string
  label: string
  type: 'group' | 'account_range' | 'formula'
  accountCodes?: string[]       // for account_range: match prefix (e.g. "1" = all 1xxx)
  formula?: string              // for formula: e.g. "assets - liabilities"
  children?: ReportRowDef[]
  negate?: boolean              // flip sign (e.g. liabilities show positive)
}

export interface ReportLayout {
  name: string
  rows: ReportRowDef[]
}

export interface ReportNode {
  id: string
  label: string
  amount: number
  children?: ReportNode[]
  level: number
}

// ── Built-in layouts ──────────────────────────────────────────────────────────

export const BALANCE_SHEET_LAYOUT: ReportLayout = {
  name: 'Neraca (Balance Sheet)',
  rows: [
    { id: 'assets', label: 'ASET', type: 'group', children: [
      { id: 'current_assets', label: 'Aset Lancar', type: 'group', children: [
        { id: 'cash',        label: 'Kas & Bank',           type: 'account_range', accountCodes: ['1110','1120','1130'] },
        { id: 'receivables', label: 'Piutang Usaha',        type: 'account_range', accountCodes: ['1200'] },
        { id: 'inventory',   label: 'Persediaan',           type: 'account_range', accountCodes: ['1300'] },
        { id: 'prepaid',     label: 'Biaya Dibayar Dimuka', type: 'account_range', accountCodes: ['1400'] },
      ]},
      { id: 'fixed_assets', label: 'Aset Tetap', type: 'group', children: [
        { id: 'ppe',         label: 'Properti & Peralatan', type: 'account_range', accountCodes: ['1500'] },
      ]},
    ]},
    { id: 'liabilities', label: 'LIABILITAS', type: 'group', negate: true, children: [
      { id: 'current_liab', label: 'Liabilitas Lancar', type: 'group', children: [
        { id: 'payables',    label: 'Utang Usaha',     type: 'account_range', accountCodes: ['2100','2110'] },
        { id: 'tax_pay',     label: 'Utang Pajak',     type: 'account_range', accountCodes: ['2200','2210'] },
        { id: 'sal_pay',     label: 'Utang Gaji',      type: 'account_range', accountCodes: ['2300'] },
      ]},
    ]},
    { id: 'equity', label: 'EKUITAS', type: 'group', negate: true, children: [
      { id: 'capital',       label: 'Modal',          type: 'account_range', accountCodes: ['3100'] },
      { id: 'retained',      label: 'Laba Ditahan',   type: 'account_range', accountCodes: ['3200'] },
    ]},
  ],
}

export const PROFIT_LOSS_LAYOUT: ReportLayout = {
  name: 'Laba Rugi (Profit & Loss)',
  rows: [
    { id: 'revenue', label: 'PENDAPATAN', type: 'group', negate: true, children: [
      { id: 'sales_rev', label: 'Pendapatan Penjualan', type: 'account_range', accountCodes: ['4100','4110'] },
      { id: 'other_rev', label: 'Pendapatan Lain-lain', type: 'account_range', accountCodes: ['4200'] },
    ]},
    { id: 'cogs', label: 'HARGA POKOK PENJUALAN', type: 'account_range', accountCodes: ['5100'] },
    { id: 'opex', label: 'BEBAN OPERASIONAL', type: 'group', children: [
      { id: 'salary_exp', label: 'Beban Gaji',      type: 'account_range', accountCodes: ['5200'] },
      { id: 'rent_exp',   label: 'Beban Sewa',      type: 'account_range', accountCodes: ['5300'] },
      { id: 'other_exp',  label: 'Beban Lain-lain', type: 'account_range', accountCodes: ['5400','5900'] },
    ]},
  ],
}

export const TRIAL_BALANCE_LAYOUT: ReportLayout = {
  name: 'Neraca Saldo (Trial Balance)',
  rows: [
    { id: 'all_accounts', label: 'SEMUA AKUN', type: 'group', children: [
      { id: 'assets_tb',      label: 'Aset',       type: 'account_range', accountCodes: ['1'] },
      { id: 'liabilities_tb', label: 'Liabilitas', type: 'account_range', accountCodes: ['2'] },
      { id: 'equity_tb',      label: 'Ekuitas',    type: 'account_range', accountCodes: ['3'] },
      { id: 'revenue_tb',     label: 'Pendapatan', type: 'account_range', accountCodes: ['4'] },
      { id: 'expense_tb',     label: 'Beban',      type: 'account_range', accountCodes: ['5'] },
    ]},
  ],
}

export const REPORT_LAYOUTS: Record<string, ReportLayout> = {
  balance_sheet: BALANCE_SHEET_LAYOUT,
  profit_loss:   PROFIT_LOSS_LAYOUT,
  trial_balance: TRIAL_BALANCE_LAYOUT,
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchAccountBalances(
  tenantId: string,
  dateFrom: string,
  dateTo: string,
): Promise<Map<string, number>> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        code: accounts.code,
        debitSum:  sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        creditSum: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.entryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, 'posted'),
        gte(journalEntries.date, dateFrom),
        lte(journalEntries.date, dateTo),
      ))
      .groupBy(accounts.code)

    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.code, Number(r.debitSum) - Number(r.creditSum))
    }
    return map
  })
}

// ── Pure functional tree builder ──────────────────────────────────────────────

function buildNode(
  def: ReportRowDef,
  balances: Map<string, number>,
  level: number,
): ReportNode {
  if (def.type === 'account_range') {
    const prefixes = def.accountCodes ?? []
    let amount = 0
    for (const [code, bal] of balances) {
      if (prefixes.some((p) => code.startsWith(p))) amount += bal
    }
    if (def.negate) amount = -amount
    return { id: def.id, label: def.label, amount, level }
  }

  if (def.type === 'group') {
    const children = (def.children ?? []).map((c) => buildNode(c, balances, level + 1))
    const amount = children.reduce((s, c) => s + c.amount, 0)
    return { id: def.id, label: def.label, amount: def.negate ? -amount : amount, children, level }
  }

  // formula type — not evaluated dynamically; return 0 placeholder
  return { id: def.id, label: def.label, amount: 0, level }
}

// ── Main report builder ───────────────────────────────────────────────────────

export async function buildReport(
  tenantId: string,
  reportType: string,
  dateFrom: string,
  dateTo: string,
  customLayout?: ReportLayout,
): Promise<{ layout: ReportLayout; nodes: ReportNode[]; generatedAt: string }> {
  const layout = customLayout ?? REPORT_LAYOUTS[reportType]
  if (!layout) throw new Error(`Unknown report type: ${reportType}`)

  const balances = await fetchAccountBalances(tenantId, dateFrom, dateTo)
  const nodes = layout.rows.map((row) => buildNode(row, balances, 0))

  return { layout, nodes, generatedAt: new Date().toISOString() }
}
