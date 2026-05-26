/**
 * Indonesian statutory payroll calculation engine — 2026.
 * All rate tables are passed as parameters (loaded from payroll_rule_parameters).
 * No hardcoded rates — swap parameters when regulations change.
 */

// ── Rule table types ──────────────────────────────────────────────────────────

export interface BpjsKesRates { employerPct: number; employeePct: number }
export interface BpjsKetRates {
  jhtEmployerPct: number; jhtEmployeePct: number
  jkkRates: Record<JkkTier, number>  // tier → pct
  jkmEmployerPct: number
  jpEmployerPct: number; jpEmployeePct: number
}
export interface BpjsKesSalaryCap { cap: number }  // IDR 12,000,000 in 2026
export interface BpjsJpSalaryCap  { cap: number }  // IDR 11,086,300 in 2026
export interface BiayaJabatanRule { pct: number; monthlyCapIdr: number; annualCapIdr: number }
export interface PtkpRule { [status: string]: number }  // e.g. TK0 → 54_000_000
export interface Pasal17Bracket { upTo: number | null; rate: number }  // null = no ceiling
export interface TerEntry { upTo: number | null; rate: number }       // null = no ceiling

export type JkkTier = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
export type PtkpStatus = 'TK0'|'TK1'|'TK2'|'TK3'|'K0'|'K1'|'K2'|'K3'
export type TaxScheme = 'gross' | 'gross_up' | 'net'

export interface PayrollRules {
  bpjsKes: BpjsKesRates
  bpjsKet: BpjsKetRates
  bpjsKesCap: number
  bpjsJpCap: number
  ptkp: PtkpRule
  pasal17: Pasal17Bracket[]
  terA: TerEntry[]
  terB: TerEntry[]
  terC: TerEntry[]
  biayaJabatan: BiayaJabatanRule
}

// ── Default 2026 rules (used as seed / fallback) ──────────────────────────────

export const DEFAULT_RULES_2026: PayrollRules = {
  bpjsKes: { employerPct: 4.0, employeePct: 1.0 },
  bpjsKet: {
    jhtEmployerPct: 3.7, jhtEmployeePct: 2.0,
    jkkRates: { very_low: 0.24, low: 0.54, medium: 0.89, high: 1.27, very_high: 1.74 },
    jkmEmployerPct: 0.3,
    jpEmployerPct: 2.0, jpEmployeePct: 1.0,
  },
  bpjsKesCap: 12_000_000,
  bpjsJpCap:  11_086_300,
  ptkp: { TK0: 54_000_000, TK1: 58_500_000, TK2: 63_000_000, TK3: 67_500_000, K0: 58_500_000, K1: 63_000_000, K2: 67_500_000, K3: 72_000_000 },
  pasal17: [
    { upTo: 60_000_000,         rate: 5  },
    { upTo: 250_000_000,        rate: 15 },
    { upTo: 500_000_000,        rate: 25 },
    { upTo: 5_000_000_000,      rate: 30 },
    { upTo: null,               rate: 35 },
  ],
  // TER A: TK/0, TK/1, K/0 — monthly gross → monthly rate %
  terA: [
    { upTo: 5_400_000,   rate: 0    },
    { upTo: 5_650_000,   rate: 0.25 },
    { upTo: 5_950_000,   rate: 0.5  },
    { upTo: 6_300_000,   rate: 0.75 },
    { upTo: 6_750_000,   rate: 1.0  },
    { upTo: 7_500_000,   rate: 1.25 },
    { upTo: 8_550_000,   rate: 1.5  },
    { upTo: 9_650_000,   rate: 1.75 },
    { upTo: 10_050_000,  rate: 2.0  },
    { upTo: 10_350_000,  rate: 2.25 },
    { upTo: 10_700_000,  rate: 2.5  },
    { upTo: 11_050_000,  rate: 3.0  },
    { upTo: 11_600_000,  rate: 3.5  },
    { upTo: 12_500_000,  rate: 4.0  },
    { upTo: 13_750_000,  rate: 5.0  },
    { upTo: 15_100_000,  rate: 6.0  },
    { upTo: 16_950_000,  rate: 7.0  },
    { upTo: 19_750_000,  rate: 8.0  },
    { upTo: 24_150_000,  rate: 9.0  },
    { upTo: 26_450_000,  rate: 10.0 },
    { upTo: 28_000_000,  rate: 11.0 },
    { upTo: 30_050_000,  rate: 12.0 },
    { upTo: 32_400_000,  rate: 13.0 },
    { upTo: 35_400_000,  rate: 14.0 },
    { upTo: 39_100_000,  rate: 15.0 },
    { upTo: 43_850_000,  rate: 16.0 },
    { upTo: 47_800_000,  rate: 17.0 },
    { upTo: 51_400_000,  rate: 18.0 },
    { upTo: 56_300_000,  rate: 19.0 },
    { upTo: 62_200_000,  rate: 20.0 },
    { upTo: 68_600_000,  rate: 21.0 },
    { upTo: 77_500_000,  rate: 22.0 },
    { upTo: 89_000_000,  rate: 23.0 },
    { upTo: 103_000_000, rate: 24.0 },
    { upTo: null,        rate: 25.0 },
  ],
  // TER B: TK/2, K/1
  terB: [
    { upTo: 6_200_000,   rate: 0    },
    { upTo: 6_500_000,   rate: 0.25 },
    { upTo: 6_850_000,   rate: 0.5  },
    { upTo: 7_300_000,   rate: 0.75 },
    { upTo: 9_200_000,   rate: 1.0  },
    { upTo: 10_750_000,  rate: 1.5  },
    { upTo: 11_250_000,  rate: 2.0  },
    { upTo: 11_600_000,  rate: 2.5  },
    { upTo: 12_600_000,  rate: 3.0  },
    { upTo: 13_600_000,  rate: 4.0  },
    { upTo: 14_950_000,  rate: 5.0  },
    { upTo: 16_400_000,  rate: 6.0  },
    { upTo: 18_450_000,  rate: 7.0  },
    { upTo: 21_850_000,  rate: 8.0  },
    { upTo: 26_000_000,  rate: 9.0  },
    { upTo: 27_700_000,  rate: 10.0 },
    { upTo: 29_350_000,  rate: 11.0 },
    { upTo: 31_450_000,  rate: 12.0 },
    { upTo: 33_950_000,  rate: 13.0 },
    { upTo: 37_100_000,  rate: 14.0 },
    { upTo: 41_100_000,  rate: 15.0 },
    { upTo: 45_800_000,  rate: 16.0 },
    { upTo: 49_500_000,  rate: 17.0 },
    { upTo: 53_800_000,  rate: 18.0 },
    { upTo: 58_500_000,  rate: 19.0 },
    { upTo: 64_000_000,  rate: 20.0 },
    { upTo: 71_000_000,  rate: 21.0 },
    { upTo: 80_000_000,  rate: 22.0 },
    { upTo: 93_000_000,  rate: 23.0 },
    { upTo: null,        rate: 24.0 },
  ],
  // TER C: K/2, K/3
  terC: [
    { upTo: 6_600_000,   rate: 0    },
    { upTo: 6_950_000,   rate: 0.25 },
    { upTo: 7_350_000,   rate: 0.5  },
    { upTo: 7_800_000,   rate: 0.75 },
    { upTo: 8_850_000,   rate: 1.0  },
    { upTo: 9_800_000,   rate: 1.25 },
    { upTo: 10_950_000,  rate: 1.5  },
    { upTo: 11_200_000,  rate: 1.75 },
    { upTo: 12_050_000,  rate: 2.0  },
    { upTo: 12_950_000,  rate: 3.0  },
    { upTo: 14_150_000,  rate: 4.0  },
    { upTo: 15_550_000,  rate: 5.0  },
    { upTo: 17_050_000,  rate: 6.0  },
    { upTo: 19_500_000,  rate: 7.0  },
    { upTo: 22_700_000,  rate: 8.0  },
    { upTo: 26_600_000,  rate: 9.0  },
    { upTo: 28_100_000,  rate: 10.0 },
    { upTo: 30_000_000,  rate: 11.0 },
    { upTo: 32_400_000,  rate: 12.0 },
    { upTo: 35_400_000,  rate: 13.0 },
    { upTo: 38_900_000,  rate: 14.0 },
    { upTo: 43_000_000,  rate: 15.0 },
    { upTo: 47_400_000,  rate: 16.0 },
    { upTo: 51_200_000,  rate: 17.0 },
    { upTo: 55_800_000,  rate: 18.0 },
    { upTo: 60_400_000,  rate: 19.0 },
    { upTo: 66_700_000,  rate: 20.0 },
    { upTo: 74_500_000,  rate: 21.0 },
    { upTo: 83_200_000,  rate: 22.0 },
    { upTo: 95_600_000,  rate: 23.0 },
    { upTo: null,        rate: 24.0 },
  ],
  biayaJabatan: { pct: 5, monthlyCapIdr: 500_000, annualCapIdr: 6_000_000 },
}

// ── TER category mapping ──────────────────────────────────────────────────────

export function getTerCategory(ptkpStatus: PtkpStatus): 'A' | 'B' | 'C' {
  if (['TK0','TK1','K0'].includes(ptkpStatus)) return 'A'
  if (['TK2','K1'].includes(ptkpStatus)) return 'B'
  return 'C'  // TK3, K2, K3
}

function lookupTieredRate(table: TerEntry[], grossMonthly: number): number {
  for (const entry of table) {
    if (entry.upTo === null || grossMonthly <= entry.upTo) return entry.rate
  }
  return table[table.length - 1]!.rate
}

// ── BPJS Kesehatan ────────────────────────────────────────────────────────────

export interface BpjsKesResult {
  wageBase: number         // capped base
  employerContrib: number  // 4% of capped base
  employeeDeduction: number // 1% of capped base
}

export function calcBpjsKesehatan(baseSalary: number, rules: PayrollRules): BpjsKesResult {
  const wageBase = Math.min(baseSalary, rules.bpjsKesCap)
  return {
    wageBase,
    employerContrib:    Math.round(wageBase * rules.bpjsKes.employerPct / 100),
    employeeDeduction:  Math.round(wageBase * rules.bpjsKes.employeePct / 100),
  }
}

// ── BPJS Ketenagakerjaan ──────────────────────────────────────────────────────

export interface BpjsKetResult {
  jhtEmployer: number
  jhtEmployee: number
  jkk: number       // employer only
  jkm: number       // employer only
  jpEmployer: number
  jpEmployee: number
  jpWageBase: number
}

export function calcBpjsKetenagakerjaan(
  baseSalary: number,
  jkkTier: JkkTier,
  rules: PayrollRules,
  jpEnabled = true,
): BpjsKetResult {
  const r = rules.bpjsKet
  const jpWageBase = jpEnabled ? Math.min(baseSalary, rules.bpjsJpCap) : 0
  return {
    jhtEmployer: Math.round(baseSalary * r.jhtEmployerPct / 100),
    jhtEmployee: Math.round(baseSalary * r.jhtEmployeePct / 100),
    jkk:         Math.round(baseSalary * r.jkkRates[jkkTier] / 100),
    jkm:         Math.round(baseSalary * r.jkmEmployerPct / 100),
    jpEmployer:  jpEnabled ? Math.round(jpWageBase * r.jpEmployerPct / 100) : 0,
    jpEmployee:  jpEnabled ? Math.round(jpWageBase * r.jpEmployeePct / 100) : 0,
    jpWageBase,
  }
}

// ── PPh 21 — monthly TER (Jan–Nov) ───────────────────────────────────────────

/**
 * Gross income for TER = base + fixed allowances + employer-paid BPJS (JKK + JKM + Kes 4%).
 * Employee deductions do NOT reduce the TER tax base.
 */
export interface Pph21TerResult {
  grossIncome: number
  terRate: number      // percent
  monthlyTax: number
  terCategory: 'A' | 'B' | 'C'
}

export function calcPph21TER(
  grossIncome: number,
  ptkpStatus: PtkpStatus,
  rules: PayrollRules,
): Pph21TerResult {
  const cat = getTerCategory(ptkpStatus)
  const table = cat === 'A' ? rules.terA : cat === 'B' ? rules.terB : rules.terC
  const terRate = lookupTieredRate(table, grossIncome)
  return {
    grossIncome,
    terRate,
    monthlyTax: Math.round(grossIncome * terRate / 100),
    terCategory: cat,
  }
}

// ── PPh 21 — December annual reconciliation (Pasal 17) ───────────────────────

function applyProgressive(brackets: Pasal17Bracket[], taxableIncome: number): number {
  let tax = 0
  let prev = 0
  for (const b of brackets) {
    if (taxableIncome <= prev) break
    const ceiling = b.upTo ?? Infinity
    const slice = Math.min(taxableIncome, ceiling) - prev
    tax += Math.round(slice * b.rate / 100)
    prev = ceiling
    if (b.upTo === null) break
  }
  return tax
}

export interface Pph21DecemberResult {
  annualGross: number
  biayaJabatan: number
  annualJhtEmployee: number    // 2% × 12
  annualJpEmployee: number     // 1% × 12
  ptkpAmount: number
  pkp: number                  // taxable income
  annualTaxPasal17: number
  ytdTerTax: number            // Jan–Nov already withheld
  decemberTax: number          // = annualTaxPasal17 − ytdTerTax (can be negative = refund)
}

export function calcPph21December(opts: {
  annualGrossIncome: number
  ptkpStatus: PtkpStatus
  ytdTerTaxJanNov: number     // sum of Jan–Nov TER withholdings
  annualJhtEmployee: number   // 2% × base × 12 (or actual amounts)
  annualJpEmployee: number    // 1% × jp_base × 12
  rules: PayrollRules
}): Pph21DecemberResult {
  const bj = opts.rules.biayaJabatan
  const rawBJ = opts.annualGrossIncome * bj.pct / 100
  const biayaJabatan = Math.min(rawBJ, bj.annualCapIdr)

  const ptkpAmount = opts.rules.ptkp[opts.ptkpStatus] ?? 54_000_000

  const netto = opts.annualGrossIncome - biayaJabatan - opts.annualJhtEmployee - opts.annualJpEmployee
  const pkp = Math.max(0, netto - ptkpAmount)
  // Round PKP down to nearest 1000 per DJP convention
  const pkpRounded = Math.floor(pkp / 1000) * 1000

  const annualTaxPasal17 = applyProgressive(opts.rules.pasal17, pkpRounded)
  const decemberTax = annualTaxPasal17 - opts.ytdTerTaxJanNov

  return {
    annualGross: opts.annualGrossIncome,
    biayaJabatan,
    annualJhtEmployee: opts.annualJhtEmployee,
    annualJpEmployee: opts.annualJpEmployee,
    ptkpAmount,
    pkp: pkpRounded,
    annualTaxPasal17,
    ytdTerTax: opts.ytdTerTaxJanNov,
    decemberTax,
  }
}

// ── THR (Tunjangan Hari Raya) ─────────────────────────────────────────────────

export interface ThrResult {
  thrAmount: number
  tenureMonths: number
  isFullMonth: boolean
}

export function calcTHR(
  baseSalary: number,
  fixedAllowancesTotal: number,
  hireDateStr: string,
  periodDateStr: string,
): ThrResult {
  const hire = new Date(hireDateStr)
  const period = new Date(periodDateStr)
  const months =
    (period.getFullYear() - hire.getFullYear()) * 12 + (period.getMonth() - hire.getMonth())
  const tenureMonths = Math.max(0, months)
  const monthlyBase = baseSalary + fixedAllowancesTotal
  if (tenureMonths >= 12) {
    return { thrAmount: monthlyBase, tenureMonths, isFullMonth: true }
  }
  return {
    thrAmount: Math.round((tenureMonths / 12) * monthlyBase),
    tenureMonths,
    isFullMonth: false,
  }
}

// ── Overtime (1/173 rule, Ministry of Manpower) ───────────────────────────────

export interface OvertimeResult {
  regularHours: number
  holiday1Hours: number    // weekday overtime (up to 1hr beyond normal)
  holiday2Hours: number    // weekend/holiday 2nd hour+
  hourlyRate: number       // base / 173
  overtimePay: number
}

export function calcOvertime(opts: {
  baseSalary: number           // monthly fixed salary for hourly rate
  regularOvertimeHours: number // weekday OT: 1.5× first hr, 2× subsequent
  holidayHours: number         // weekend/holiday: 2× first 8hrs, 3× beyond
}): OvertimeResult {
  const hourlyRate = Math.round(opts.baseSalary / 173)
  // Simplified: weekday OT all at 1.5×, holiday all at 2×
  const overtimePay = Math.round(
    hourlyRate * 1.5 * opts.regularOvertimeHours +
    hourlyRate * 2   * opts.holidayHours
  )
  return {
    regularHours: opts.regularOvertimeHours,
    holiday1Hours: opts.holidayHours,
    holiday2Hours: 0,
    hourlyRate,
    overtimePay,
  }
}

// ── Auto-calculate full payslip lines ────────────────────────────────────────

export interface SalarySettings {
  baseSalary: number
  ptkpStatus: PtkpStatus
  taxScheme: TaxScheme
  jkkTier: JkkTier
  bpjsKesEnabled: boolean
  bpjsKetEnabled: boolean
  jpEnabled: boolean
  fixedAllowances: { name: string; amount: number }[]
  hireDate: string | null    // ISO date
}

export interface PayslipLineInput {
  kind: 'earning' | 'deduction'
  name: string
  amount: number
  sortOrder: number
}

export interface AutoCalcResult {
  lines: PayslipLineInput[]
  grossIncome: number         // for TER tax base (includes employer BPJS)
  grossTotal: number          // sum of earnings
  deductionTotal: number
  netTotal: number
  pph21Monthly: number
  bpjsKes: BpjsKesResult | null
  bpjsKet: BpjsKetResult | null
  pph21Detail: Pph21TerResult | null
  month: number               // 1–12
  year: number
}

export function autoCalcPayslipLines(
  settings: SalarySettings,
  periodStart: string,   // YYYY-MM-DD
  month: number,         // 1–12
  year: number,
  rules: PayrollRules,
  isDecember = false,
  ytdTerTaxJanNov = 0,
  annualJhtEmployee = 0,
  annualJpEmployee = 0,
): AutoCalcResult {
  const lines: PayslipLineInput[] = []
  let ord = 0

  const push = (kind: 'earning' | 'deduction', name: string, amount: number) => {
    if (amount !== 0) lines.push({ kind, name, amount, sortOrder: ord++ })
  }

  const fixedTotal = settings.fixedAllowances.reduce((s, a) => s + a.amount, 0)

  // 1. Base salary
  push('earning', 'Gaji Pokok', settings.baseSalary)
  for (const a of settings.fixedAllowances) push('earning', a.name, a.amount)

  // 2. BPJS Kesehatan
  let kesResult: BpjsKesResult | null = null
  if (settings.bpjsKesEnabled) {
    kesResult = calcBpjsKesehatan(settings.baseSalary, rules)
    push('earning', 'Tunjangan BPJS Kesehatan 4% (Perusahaan)', kesResult.employerContrib)
  }

  // 3. BPJS Ketenagakerjaan
  let ketResult: BpjsKetResult | null = null
  if (settings.bpjsKetEnabled) {
    ketResult = calcBpjsKetenagakerjaan(settings.baseSalary, settings.jkkTier, rules, settings.jpEnabled)
    const jkkPct = rules.bpjsKet.jkkRates[settings.jkkTier]
    push('earning', `Tunjangan JKK ${jkkPct.toFixed(2)}% (Perusahaan)`, ketResult.jkk)
    push('earning', 'Tunjangan JKM 0.30% (Perusahaan)', ketResult.jkm)
    push('earning', 'Tunjangan JHT 3.7% (Perusahaan)', ketResult.jhtEmployer)
    if (settings.jpEnabled) push('earning', 'Tunjangan JP 2% (Perusahaan)', ketResult.jpEmployer)
  }

  // 4. Gross income for TER (base + allowances + employer BPJS)
  const employerBpjsTotal =
    (kesResult?.employerContrib ?? 0) +
    (ketResult ? ketResult.jkk + ketResult.jkm + ketResult.jhtEmployer + ketResult.jpEmployer : 0)
  const grossIncomeForTax = settings.baseSalary + fixedTotal + employerBpjsTotal

  // 5. PPh 21
  let pph21Result: Pph21TerResult | null = null
  let pph21Tax = 0
  if (!isDecember) {
    pph21Result = calcPph21TER(grossIncomeForTax, settings.ptkpStatus, rules)
    pph21Tax = pph21Result.monthlyTax
  } else {
    const annualGross = grossIncomeForTax * 12
    const decResult = calcPph21December({
      annualGrossIncome: annualGross,
      ptkpStatus: settings.ptkpStatus,
      ytdTerTaxJanNov,
      annualJhtEmployee,
      annualJpEmployee,
      rules,
    })
    pph21Tax = Math.max(0, decResult.decemberTax)
  }

  // 6. Tax allowance: for 'gross_up' scheme, add a tax allowance equal to PPh21
  if (settings.taxScheme === 'gross_up' && pph21Tax > 0) {
    push('earning', 'Tunjangan Pajak (Tax Allowance)', pph21Tax)
  }

  // 7. Deductions
  if (kesResult) push('deduction', 'Potongan BPJS Kesehatan 1% (Karyawan)', kesResult.employeeDeduction)
  if (ketResult) {
    push('deduction', 'Potongan JHT 2% (Karyawan)', ketResult.jhtEmployee)
    if (settings.jpEnabled) push('deduction', 'Potongan JP 1% (Karyawan)', ketResult.jpEmployee)
  }
  if (pph21Tax > 0) push('deduction', 'PPh 21', pph21Tax)

  const grossTotal      = lines.filter(l => l.kind === 'earning').reduce((s, l) => s + l.amount, 0)
  const deductionTotal  = lines.filter(l => l.kind === 'deduction').reduce((s, l) => s + l.amount, 0)

  return {
    lines,
    grossIncome: grossIncomeForTax,
    grossTotal,
    deductionTotal,
    netTotal: grossTotal - deductionTotal,
    pph21Monthly: pph21Tax,
    bpjsKes: kesResult,
    bpjsKet: ketResult,
    pph21Detail: pph21Result,
    month,
    year,
  }
}
