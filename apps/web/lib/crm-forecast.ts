import 'server-only'
import { and, eq, gte, lte, isNull, sql } from 'drizzle-orm'
import { deals, salesTeams, users } from '@kantorcore/db'
import { withTenant } from './db'
import type { DealStage } from './crm'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForecastPeriod {
  start: Date
  end: Date
  label: string
}

export interface StageBreakdown {
  stage: DealStage
  count: number
  totalValue: number
  weightedValue: number
}

export interface ForecastResult {
  period: ForecastPeriod
  bestCase: number       // sum of all open deal amounts
  expectedCase: number   // sum of (amount * probability / 100)
  worstCase: number      // sum of (amount * stage_min_probability / 100)
  closedRevenue: number  // already-won deals in the period
  target: number         // team or org target
  byStage: StageBreakdown[]
  bySalesperson: SalespersonForecast[]
}

export interface SalespersonForecast {
  userId: string
  userName: string
  bestCase: number
  expectedCase: number
  closedRevenue: number
  dealCount: number
  wonCount: number
}

// Minimum probability per stage for worst-case scenario
const STAGE_MIN_PROBABILITY: Record<DealStage, number> = {
  lead:        5,
  qualified:  20,
  proposal:   40,
  negotiation: 60,
  won:        100,
  lost:         0,
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function presetPeriod(preset: string): ForecastPeriod {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (preset) {
    case 'this_month': {
      const start = new Date(y, m, 1)
      const end   = new Date(y, m + 1, 0)
      return { start, end, label: start.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
    }
    case 'next_month': {
      const start = new Date(y, m + 1, 1)
      const end   = new Date(y, m + 2, 0)
      return { start, end, label: start.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
    }
    case 'this_quarter': {
      const q = Math.floor(m / 3)
      const start = new Date(y, q * 3, 1)
      const end   = new Date(y, q * 3 + 3, 0)
      return { start, end, label: `Q${q + 1} ${y}` }
    }
    case 'next_quarter': {
      const q = Math.floor(m / 3) + 1
      const qy = q >= 4 ? y + 1 : y
      const qn = q >= 4 ? 0 : q
      const start = new Date(qy, qn * 3, 1)
      const end   = new Date(qy, qn * 3 + 3, 0)
      return { start, end, label: `Q${qn + 1} ${qy}` }
    }
    case 'this_year': {
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31), label: `Tahun ${y}` }
    }
    default: {
      // 'this_month' fallback
      const start = new Date(y, m, 1)
      const end   = new Date(y, m + 1, 0)
      return { start, end, label: start.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
    }
  }
}

// ── Forecast calculation ──────────────────────────────────────────────────────

export async function getForecast(
  tenantId: string,
  opts: {
    teamId?: string | null
    period: ForecastPeriod
  },
): Promise<ForecastResult> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(deals.tenantId, tenantId),
      isNull(deals.deletedAt),
      gte(deals.expectedClose, opts.period.start.toISOString().split('T')[0]!),
      lte(deals.expectedClose, opts.period.end.toISOString().split('T')[0]!),
    ]
    if (opts.teamId) conditions.push(eq(deals.teamId, opts.teamId))

    const where = and(...conditions)!

    const rows = await tx
      .select({
        id:           deals.id,
        stage:        deals.stage,
        expectedValue: deals.expectedValue,
        probability:  deals.probability,
        assignedTo:   deals.assignedTo,
      })
      .from(deals)
      .where(where)

    // Stage breakdown
    const stageMap = new Map<DealStage, StageBreakdown>()
    for (const row of rows) {
      const s = row.stage as DealStage
      if (!stageMap.has(s)) {
        stageMap.set(s, { stage: s, count: 0, totalValue: 0, weightedValue: 0 })
      }
      const entry = stageMap.get(s)!
      entry.count++
      entry.totalValue += row.expectedValue
      entry.weightedValue += Math.round(row.expectedValue * row.probability / 100)
    }

    const openRows = rows.filter((r) => r.stage !== 'lost')
    const wonRows  = rows.filter((r) => r.stage === 'won')

    const bestCase     = openRows.reduce((s, r) => s + r.expectedValue, 0)
    const expectedCase = openRows.reduce((s, r) => s + Math.round(r.expectedValue * r.probability / 100), 0)
    const worstCase    = openRows.reduce((s, r) => {
      const minP = STAGE_MIN_PROBABILITY[r.stage as DealStage] ?? 0
      return s + Math.round(r.expectedValue * minP / 100)
    }, 0)
    const closedRevenue = wonRows.reduce((s, r) => s + r.expectedValue, 0)

    // Salesperson breakdown
    const userIds = [...new Set(rows.map((r) => r.assignedTo).filter(Boolean) as string[])]
    const userNames = userIds.length > 0
      ? await tx.select({ id: users.id, name: users.name }).from(users)
      : []
    const nameMap = new Map(userNames.map((u) => [u.id, u.name]))

    const spMap = new Map<string, SalespersonForecast>()
    for (const row of rows) {
      if (!row.assignedTo) continue
      if (!spMap.has(row.assignedTo)) {
        spMap.set(row.assignedTo, {
          userId:         row.assignedTo,
          userName:       nameMap.get(row.assignedTo) ?? 'Unknown',
          bestCase:       0,
          expectedCase:   0,
          closedRevenue:  0,
          dealCount:      0,
          wonCount:       0,
        })
      }
      const sp = spMap.get(row.assignedTo)!
      sp.dealCount++
      if (row.stage !== 'lost') {
        sp.bestCase   += row.expectedValue
        sp.expectedCase += Math.round(row.expectedValue * row.probability / 100)
      }
      if (row.stage === 'won') {
        sp.closedRevenue += row.expectedValue
        sp.wonCount++
      }
    }

    // Team target
    let target = 0
    if (opts.teamId) {
      const [team] = await tx
        .select({ targetRevenue: salesTeams.targetRevenue })
        .from(salesTeams)
        .where(eq(salesTeams.id, opts.teamId))
        .limit(1)
      target = team?.targetRevenue ?? 0
    }

    return {
      period:       opts.period,
      bestCase,
      expectedCase,
      worstCase,
      closedRevenue,
      target,
      byStage:      [...stageMap.values()],
      bySalesperson: [...spMap.values()].sort((a, b) => b.expectedCase - a.expectedCase),
    }
  })
}

// ── Salesperson performance report ────────────────────────────────────────────

export interface SalespersonReport {
  userId: string
  userName: string
  userEmail: string
  assignedLeads: number
  activeDeals: number
  wonDeals: number
  lostDeals: number
  winRate: number         // won / (won + lost) * 100
  avgDealSize: number
  totalRevenue: number    // sum of won deals
  pipelineValue: number   // weighted open pipeline
  target: number
}

export async function getSalespersonReport(
  tenantId: string,
  opts: { teamId?: string | null; period: ForecastPeriod },
): Promise<SalespersonReport[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(deals.tenantId, tenantId),
      isNull(deals.deletedAt),
    ]
    if (opts.teamId) conditions.push(eq(deals.teamId, opts.teamId))

    const rows = await tx
      .select({
        assignedTo:   deals.assignedTo,
        stage:        deals.stage,
        expectedValue: deals.expectedValue,
        probability:  deals.probability,
      })
      .from(deals)
      .where(and(...conditions)!)

    const spMap = new Map<string, {
      wonDeals: number; lostDeals: number; activeDeals: number
      wonRevenue: number; pipelineValue: number; dealSizes: number[]
    }>()

    for (const r of rows) {
      if (!r.assignedTo) continue
      if (!spMap.has(r.assignedTo)) {
        spMap.set(r.assignedTo, { wonDeals: 0, lostDeals: 0, activeDeals: 0, wonRevenue: 0, pipelineValue: 0, dealSizes: [] })
      }
      const sp = spMap.get(r.assignedTo)!
      if (r.stage === 'won') { sp.wonDeals++; sp.wonRevenue += r.expectedValue; sp.dealSizes.push(r.expectedValue) }
      else if (r.stage === 'lost') { sp.lostDeals++ }
      else { sp.activeDeals++; sp.pipelineValue += Math.round(r.expectedValue * r.probability / 100) }
    }

    if (spMap.size === 0) return []

    const userRows = await tx
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)

    return [...spMap.entries()].map(([userId, stats]) => {
      const user = userRows.find((u) => u.id === userId)
      const total = stats.wonDeals + stats.lostDeals
      return {
        userId,
        userName:      user?.name ?? 'Unknown',
        userEmail:     user?.email ?? '',
        assignedLeads: 0,
        activeDeals:   stats.activeDeals,
        wonDeals:      stats.wonDeals,
        lostDeals:     stats.lostDeals,
        winRate:       total > 0 ? Math.round(stats.wonDeals / total * 100) : 0,
        avgDealSize:   stats.dealSizes.length > 0
          ? Math.round(stats.dealSizes.reduce((s, v) => s + v, 0) / stats.dealSizes.length)
          : 0,
        totalRevenue:  stats.wonRevenue,
        pipelineValue: stats.pipelineValue,
        target:        0,
      }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  })
}
