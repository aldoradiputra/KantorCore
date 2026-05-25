import 'server-only'
import { and, eq, gte, lte, isNull, sql } from 'drizzle-orm'
import { salesOrders, users, salesTeams } from '@kantorcore/db'
import { withTenant } from './db'
import type { SoStatus } from './sales'

// ── Status summary ────────────────────────────────────────────────────────────

export interface StatusBucket {
  status:     SoStatus
  count:      number
  totalValue: number
}

export async function getStatusSummary(
  tenantId: string,
  opts: { teamId?: string | null; from?: Date; to?: Date } = {},
): Promise<StatusBucket[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(salesOrders.tenantId, tenantId), isNull(salesOrders.deletedAt)]
    if (opts.teamId) conditions.push(eq(salesOrders.teamId, opts.teamId))
    if (opts.from)   conditions.push(gte(salesOrders.date, opts.from.toISOString().split('T')[0]!))
    if (opts.to)     conditions.push(lte(salesOrders.date, opts.to.toISOString().split('T')[0]!))

    const rows = await tx
      .select({
        status:     salesOrders.status,
        count:      sql<number>`count(*)::int`,
        totalValue: sql<number>`COALESCE(SUM(total_amount),0)::bigint`,
      })
      .from(salesOrders)
      .where(and(...conditions)!)
      .groupBy(salesOrders.status)

    return rows.map((r) => ({
      status:     r.status as SoStatus,
      count:      r.count,
      totalValue: Number(r.totalValue),
    }))
  })
}

// ── Revenue trend (weekly) ────────────────────────────────────────────────────

export interface RevenuePoint {
  week:         string
  quotation:    number
  confirmed:    number
  done:         number
}

export async function getRevenueTrend(
  tenantId: string,
  opts: { teamId?: string | null; weeks?: number } = {},
): Promise<RevenuePoint[]> {
  const weeksBack = opts.weeks ?? 12
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt),
      sql`date >= now() - interval '${sql.raw(String(weeksBack))} weeks'`,
    ]
    if (opts.teamId) conditions.push(eq(salesOrders.teamId, opts.teamId))

    const rows = await tx
      .select({
        week:       sql<string>`to_char(date::date, 'IYYY-IW')`,
        status:     salesOrders.status,
        totalValue: sql<number>`COALESCE(SUM(total_amount),0)::bigint`,
      })
      .from(salesOrders)
      .where(and(...conditions)!)
      .groupBy(sql`to_char(date::date, 'IYYY-IW')`, salesOrders.status)
      .orderBy(sql`to_char(date::date, 'IYYY-IW')`)

    const weekMap = new Map<string, RevenuePoint>()
    for (const r of rows) {
      if (!weekMap.has(r.week)) {
        weekMap.set(r.week, { week: r.week, quotation: 0, confirmed: 0, done: 0 })
      }
      const point = weekMap.get(r.week)!
      const val = Number(r.totalValue)
      if (r.status === 'quotation') point.quotation += val
      else if (r.status === 'confirmed') point.confirmed += val
      else if (r.status === 'done') point.done += val
    }

    return [...weekMap.values()].map((p) => ({
      ...p,
      week: (() => {
        const [y, w] = p.week.split('-')
        const d = new Date(Number(y), 0, 1 + (Number(w) - 1) * 7)
        return d.toLocaleString('id-ID', { month: 'short' }) + ` W${w}`
      })(),
    }))
  })
}

// ── Top customers ─────────────────────────────────────────────────────────────

export interface TopCustomer {
  customerName: string
  orderCount:   number
  totalValue:   number
}

export async function getTopCustomers(
  tenantId: string,
  opts: { teamId?: string | null; limit?: number } = {},
): Promise<TopCustomer[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt),
    ]
    if (opts.teamId) conditions.push(eq(salesOrders.teamId, opts.teamId))

    const rows = await tx
      .select({
        customerName: salesOrders.customerName,
        orderCount:   sql<number>`count(*)::int`,
        totalValue:   sql<number>`COALESCE(SUM(total_amount),0)::bigint`,
      })
      .from(salesOrders)
      .where(and(...conditions)!)
      .groupBy(salesOrders.customerName)
      .orderBy(sql`SUM(total_amount) DESC`)
      .limit(opts.limit ?? 10)

    return rows.map((r) => ({
      customerName: r.customerName,
      orderCount:   r.orderCount,
      totalValue:   Number(r.totalValue),
    }))
  })
}

// ── Salesperson breakdown ─────────────────────────────────────────────────────

export interface SalespersonStat {
  userId:     string
  userName:   string
  orderCount: number
  totalValue: number
  wonValue:   number  // status='done'
}

export async function getSalespersonBreakdown(
  tenantId: string,
  opts: { teamId?: string | null } = {},
): Promise<SalespersonStat[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt),
    ]
    if (opts.teamId) conditions.push(eq(salesOrders.teamId, opts.teamId))

    const rows = await tx
      .select({
        userId:     salesOrders.assignedTo,
        userName:   users.name,
        orderCount: sql<number>`count(*)::int`,
        totalValue: sql<number>`COALESCE(SUM(total_amount),0)::bigint`,
        wonValue:   sql<number>`COALESCE(SUM(CASE WHEN status='done' THEN total_amount ELSE 0 END),0)::bigint`,
      })
      .from(salesOrders)
      .leftJoin(users, eq(salesOrders.assignedTo, users.id))
      .where(and(...conditions)!)
      .groupBy(salesOrders.assignedTo, users.name)

    return rows
      .filter((r) => r.userId !== null)
      .map((r) => ({
        userId:     r.userId!,
        userName:   r.userName ?? 'Unknown',
        orderCount: r.orderCount,
        totalValue: Number(r.totalValue),
        wonValue:   Number(r.wonValue),
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
  })
}

// ── KPI summary (current month) ───────────────────────────────────────────────

export interface SalesKpis {
  totalOrders:      number
  totalRevenue:     number
  avgOrderValue:    number
  conversionRate:   number  // (confirmed+done) / total * 100
  openQuotationVal: number
  confirmedVal:     number
  doneVal:          number
}

export async function getSalesKpis(
  tenantId: string,
  opts: { teamId?: string | null; from?: Date; to?: Date } = {},
): Promise<SalesKpis> {
  const buckets = await getStatusSummary(tenantId, opts)

  const totalOrders   = buckets.reduce((s, b) => s + b.count, 0)
  const allValue      = buckets.reduce((s, b) => s + b.totalValue, 0)
  const closedCount   = buckets.filter((b) => b.status === 'confirmed' || b.status === 'done').reduce((s, b) => s + b.count, 0)
  const avgOrderValue = totalOrders > 0 ? Math.round(allValue / totalOrders) : 0

  return {
    totalOrders,
    totalRevenue:     buckets.filter((b) => b.status === 'done').reduce((s, b) => s + b.totalValue, 0),
    avgOrderValue,
    conversionRate:   totalOrders > 0 ? Math.round(closedCount / totalOrders * 100) : 0,
    openQuotationVal: buckets.find((b) => b.status === 'quotation')?.totalValue ?? 0,
    confirmedVal:     buckets.find((b) => b.status === 'confirmed')?.totalValue ?? 0,
    doneVal:          buckets.find((b) => b.status === 'done')?.totalValue ?? 0,
  }
}
