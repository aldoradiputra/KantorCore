import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import {
  timesheetEntries,
  employees,
  type TimesheetEntry,
} from '@kantorcore/db'
import { withTenant } from './db'

export interface TimesheetEntryRow extends TimesheetEntry {
  employeeName: string
  projectId: string | null
  issueId: string | null
}

export interface WeeklySummaryRow {
  employeeId: string
  employeeName: string
  date: string
  totalMinutes: number
  billableMinutes: number
  projectId: string | null
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listTimesheetEntries(
  tenantId: string,
  opts: {
    employeeId?: string
    projectId?: string
    dateFrom?: string
    dateTo?: string
    billable?: boolean
  } = {},
  limit = 200,
): Promise<TimesheetEntryRow[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(timesheetEntries.tenantId, tenantId)]
    if (opts.employeeId) conditions.push(eq(timesheetEntries.employeeId, opts.employeeId))
    if (opts.projectId) conditions.push(eq(timesheetEntries.projectId, opts.projectId))
    if (opts.dateFrom) conditions.push(gte(timesheetEntries.date, opts.dateFrom))
    if (opts.dateTo) conditions.push(lte(timesheetEntries.date, opts.dateTo))
    if (opts.billable !== undefined) conditions.push(eq(timesheetEntries.billable, opts.billable))

    const rows = await tx
      .select({
        entry: timesheetEntries,
        employeeName: employees.name,
      })
      .from(timesheetEntries)
      .innerJoin(employees, eq(timesheetEntries.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(timesheetEntries.date), desc(timesheetEntries.createdAt))
      .limit(limit)

    return rows.map((r) => ({
      ...r.entry,
      employeeName: r.employeeName,
      projectId: r.entry.projectId,
      issueId: r.entry.issueId,
    }))
  })
}

// ── Weekly summary ─────────────────────────────────────────────────────────────
// Aggregates per employee+date+project.

export async function getWeeklySummary(
  tenantId: string,
  dateFrom: string,
  dateTo: string,
  employeeId?: string,
): Promise<WeeklySummaryRow[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(timesheetEntries.tenantId, tenantId),
      gte(timesheetEntries.date, dateFrom),
      lte(timesheetEntries.date, dateTo),
    ]
    if (employeeId) conditions.push(eq(timesheetEntries.employeeId, employeeId))

    const rows = await tx
      .select({
        employeeId: timesheetEntries.employeeId,
        employeeName: employees.name,
        date: timesheetEntries.date,
        projectId: timesheetEntries.projectId,
        totalMinutes: sql<number>`sum(${timesheetEntries.durationMinutes})::int`,
        billableMinutes: sql<number>`sum(case when ${timesheetEntries.billable} then ${timesheetEntries.durationMinutes} else 0 end)::int`,
      })
      .from(timesheetEntries)
      .innerJoin(employees, eq(timesheetEntries.employeeId, employees.id))
      .where(and(...conditions))
      .groupBy(
        timesheetEntries.employeeId,
        employees.name,
        timesheetEntries.date,
        timesheetEntries.projectId,
      )
      .orderBy(asc(timesheetEntries.date), asc(employees.name))

    return rows.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      date: r.date,
      totalMinutes: r.totalMinutes ?? 0,
      billableMinutes: r.billableMinutes ?? 0,
      projectId: r.projectId,
    }))
  })
}

// ── Get one ───────────────────────────────────────────────────────────────────

export async function getTimesheetEntry(
  tenantId: string,
  id: string,
): Promise<TimesheetEntryRow | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        entry: timesheetEntries,
        employeeName: employees.name,
      })
      .from(timesheetEntries)
      .innerJoin(employees, eq(timesheetEntries.employeeId, employees.id))
      .where(and(eq(timesheetEntries.tenantId, tenantId), eq(timesheetEntries.id, id)))
      .limit(1)

    if (!rows[0]) return null
    return {
      ...rows[0].entry,
      employeeName: rows[0].employeeName,
      projectId: rows[0].entry.projectId,
      issueId: rows[0].entry.issueId,
    }
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTimesheetEntry(
  tenantId: string,
  userId: string,
  input: {
    employeeId: string
    date: string
    durationMinutes: number
    description?: string | null
    billable?: boolean
    projectId?: string | null
    issueId?: string | null
  },
): Promise<{ ok: true; entry: TimesheetEntry } | { ok: false; error: string }> {
  if (!input.employeeId) return { ok: false, error: 'employee_id wajib diisi.' }
  if (!input.date) return { ok: false, error: 'date wajib diisi.' }
  if (!input.durationMinutes || input.durationMinutes <= 0) {
    return { ok: false, error: 'duration_minutes harus lebih dari 0.' }
  }

  // Validate employee belongs to tenant
  const emp = await withTenant(tenantId, (tx) =>
    tx
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, input.employeeId)))
      .limit(1),
  )
  if (!emp[0]) return { ok: false, error: 'Karyawan tidak ditemukan.' }

  return withTenant(tenantId, async (tx) => {
    const [entry] = await tx
      .insert(timesheetEntries)
      .values({
        tenantId,
        employeeId: input.employeeId,
        date: input.date,
        durationMinutes: input.durationMinutes,
        description: input.description ?? null,
        billable: input.billable ?? true,
        projectId: input.projectId ?? null,
        issueId: input.issueId ?? null,
        createdBy: userId,
      })
      .returning()

    return { ok: true as const, entry: entry! }
  })
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateTimesheetEntry(
  tenantId: string,
  id: string,
  patch: {
    date?: string
    durationMinutes?: number
    description?: string | null
    billable?: boolean
    projectId?: string | null
    issueId?: string | null
  },
): Promise<{ ok: true; entry: TimesheetEntry } | { ok: false; error: string }> {
  if (patch.durationMinutes !== undefined && patch.durationMinutes <= 0) {
    return { ok: false, error: 'duration_minutes harus lebih dari 0.' }
  }

  return withTenant(tenantId, async (tx) => {
    const [entry] = await tx
      .update(timesheetEntries)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(timesheetEntries.tenantId, tenantId), eq(timesheetEntries.id, id)))
      .returning()

    if (!entry) return { ok: false as const, error: 'Entry tidak ditemukan.' }
    return { ok: true as const, entry }
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteTimesheetEntry(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [deleted] = await tx
      .delete(timesheetEntries)
      .where(and(eq(timesheetEntries.tenantId, tenantId), eq(timesheetEntries.id, id)))
      .returning({ id: timesheetEntries.id })

    if (!deleted) return { ok: false as const, error: 'Entry tidak ditemukan.' }
    return { ok: true as const }
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}j`
  return `${h}j ${m}m`
}

/** Return ISO week start (Monday) for a given date string (YYYY-MM-DD). */
export function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function weekEnd(weekStartStr: string): string {
  const d = new Date(weekStartStr)
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}
