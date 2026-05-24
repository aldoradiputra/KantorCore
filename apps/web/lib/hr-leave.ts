import 'server-only'
import { and, eq, gte, lte, or, sql, desc } from 'drizzle-orm'
import {
  timeOffRequests,
  leaveType,
  employees,
  users,
  type TimeOffRequest,
} from '@kantorcore/db'
import { withTenant } from './db'

export interface LeaveRow {
  id: string
  employeeName: string
  leaveType: string
  startDate: string   // 'YYYY-MM-DD'
  endDate: string
  halfDay: boolean
  status: string
  notes: string | null
  approvedBy: string | null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Format a JS Date as 'YYYY-MM-DD' in UTC. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Returns { yesterday, today, tomorrow } as 'YYYY-MM-DD' strings in UTC. */
function getWindowDates(): { yesterday: string; today: string; tomorrow: string } {
  const now = new Date()
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return {
    yesterday: toDateStr(new Date(todayMs - 86_400_000)),
    today:     toDateStr(new Date(todayMs)),
    tomorrow:  toDateStr(new Date(todayMs + 86_400_000)),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns approved leave requests that overlap the yesterday/today/tomorrow
 * window, partitioned by bucket date.
 */
export async function getLeaveAroundToday(
  tenantId: string,
): Promise<{ yesterday: LeaveRow[]; today: LeaveRow[]; tomorrow: LeaveRow[] }> {
  const { yesterday, today, tomorrow } = getWindowDates()

  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: timeOffRequests.id,
        employeeName: employees.name,
        leaveType: timeOffRequests.leaveType,
        startDate: timeOffRequests.startDate,
        endDate: timeOffRequests.endDate,
        halfDay: timeOffRequests.halfDay,
        status: timeOffRequests.status,
        notes: timeOffRequests.notes,
        approvedBy: users.name,
      })
      .from(timeOffRequests)
      .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .leftJoin(users, eq(timeOffRequests.approvedBy, users.id))
      .where(
        and(
          eq(timeOffRequests.tenantId, tenantId),
          eq(timeOffRequests.status, 'approved'),
          lte(timeOffRequests.startDate, tomorrow),
          gte(timeOffRequests.endDate, yesterday),
        ),
      )

    const toLeaveRow = (r: typeof rows[number]): LeaveRow => ({
      id: r.id,
      employeeName: r.employeeName,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      halfDay: r.halfDay,
      status: r.status,
      notes: r.notes ?? null,
      approvedBy: r.approvedBy ?? null,
    })

    const inBucket = (row: typeof rows[number], bucket: string) =>
      row.startDate <= bucket && row.endDate >= bucket

    return {
      yesterday: rows.filter((r) => inBucket(r, yesterday)).map(toLeaveRow),
      today:     rows.filter((r) => inBucket(r, today)).map(toLeaveRow),
      tomorrow:  rows.filter((r) => inBucket(r, tomorrow)).map(toLeaveRow),
    }
  })
}

/**
 * Returns all leave requests for the tenant (any status), ordered by
 * startDate descending, with a total count for pagination.
 */
export async function listLeaveRequests(
  tenantId: string,
  limit = 100,
  offset = 0,
): Promise<{ rows: LeaveRow[]; total: number }> {
  return withTenant(tenantId, async (tx) => {
    const [countResult, rows] = await Promise.all([
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(timeOffRequests)
        .where(eq(timeOffRequests.tenantId, tenantId)),

      tx
        .select({
          id: timeOffRequests.id,
          employeeName: employees.name,
          leaveType: timeOffRequests.leaveType,
          startDate: timeOffRequests.startDate,
          endDate: timeOffRequests.endDate,
          halfDay: timeOffRequests.halfDay,
          status: timeOffRequests.status,
          notes: timeOffRequests.notes,
          approvedBy: users.name,
        })
        .from(timeOffRequests)
        .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
        .leftJoin(users, eq(timeOffRequests.approvedBy, users.id))
        .where(eq(timeOffRequests.tenantId, tenantId))
        .orderBy(desc(timeOffRequests.startDate))
        .limit(limit)
        .offset(offset),
    ])

    return {
      rows: rows.map((r) => ({
        id: r.id,
        employeeName: r.employeeName,
        leaveType: r.leaveType,
        startDate: r.startDate,
        endDate: r.endDate,
        halfDay: r.halfDay,
        status: r.status,
        notes: r.notes ?? null,
        approvedBy: r.approvedBy ?? null,
      })),
      total: countResult[0]?.count ?? 0,
    }
  })
}

/** Valid leave type values from the DB enum. */
const VALID_LEAVE_TYPES = leaveType.enumValues

/**
 * Creates a new leave request with status 'pending'.
 * Returns { ok: true, id } on success or { ok: false, error } on validation failure.
 */
export async function createLeaveRequest(input: {
  tenantId: string
  employeeId: string
  createdBy: string
  leaveType: string
  startDate: string
  endDate: string
  halfDay?: boolean
  notes?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.startDate > input.endDate) {
    return { ok: false, error: 'startDate must be on or before endDate' }
  }

  if (!(VALID_LEAVE_TYPES as readonly string[]).includes(input.leaveType)) {
    return {
      ok: false,
      error: `Invalid leaveType "${input.leaveType}". Must be one of: ${VALID_LEAVE_TYPES.join(', ')}`,
    }
  }

  try {
    const id = await withTenant(input.tenantId, async (tx) => {
      const [inserted] = await tx
        .insert(timeOffRequests)
        .values({
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          createdBy: input.createdBy,
          leaveType: input.leaveType as (typeof VALID_LEAVE_TYPES)[number],
          startDate: input.startDate,
          endDate: input.endDate,
          halfDay: input.halfDay ?? false,
          notes: input.notes ?? null,
          status: 'pending',
        })
        .returning({ id: timeOffRequests.id })

      return inserted.id
    })

    return { ok: true, id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
