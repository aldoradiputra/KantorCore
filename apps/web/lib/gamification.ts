import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  badges, employeeBadges, challenges, employeeChallenges, goalHistory,
  employees,
  type Badge, type Challenge, type EmployeeChallenge, type GoalHistory,
  type GoalResult,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { Badge, Challenge, EmployeeChallenge, GoalHistory, GoalResult }

// ── Badges ─────────────────────────────────────────────────────────────────────

export async function listBadges(tenantId: string): Promise<Badge[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(badges)
      .where(eq(badges.tenantId, tenantId))
      .orderBy(asc(badges.name))
  )
}

export async function createBadge(input: {
  tenantId:    string
  userId:      string
  name:        string
  icon?:       string
  color?:      string
  description?: string | null
}): Promise<{ ok: true; badge: Badge } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Nama badge wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const [badge] = await tx.insert(badges).values({
      tenantId:    input.tenantId,
      name,
      icon:        input.icon ?? '🏆',
      color:       input.color ?? '#3B4FC4',
      description: input.description ?? null,
      createdBy:   input.userId,
    }).returning()
    return { ok: true as const, badge: badge! }
  })
}

export async function awardBadge(input: {
  tenantId:    string
  employeeId:  string
  badgeId:     string
  awardedBy:   string
  reason?:     string | null
  challengeId?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    await tx.insert(employeeBadges).values({
      tenantId:    input.tenantId,
      employeeId:  input.employeeId,
      badgeId:     input.badgeId,
      awardedBy:   input.awardedBy,
      reason:      input.reason ?? null,
      challengeId: input.challengeId ?? null,
    })
    return { ok: true as const }
  })
}

export async function getEmployeeBadges(tenantId: string, employeeId: string) {
  return withTenant(tenantId, (tx) =>
    tx.select({ eb: employeeBadges, badge: badges })
      .from(employeeBadges)
      .leftJoin(badges, eq(employeeBadges.badgeId, badges.id))
      .where(eq(employeeBadges.employeeId, employeeId))
      .orderBy(desc(employeeBadges.awardedAt))
  )
}

// ── Challenges ────────────────────────────────────────────────────────────────

export async function listChallenges(tenantId: string, activeOnly = true): Promise<Challenge[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(challenges)
      .where(and(
        eq(challenges.tenantId, tenantId),
        activeOnly ? eq(challenges.isActive, true) : undefined,
      ))
      .orderBy(asc(challenges.targetDate), asc(challenges.title))
  )
}

export async function createChallenge(input: {
  tenantId:     string
  userId:       string
  title:        string
  description?: string | null
  metricType:   'revenue' | 'deals_closed' | 'tasks_completed' | 'training_hours' | 'custom'
  targetValue:  number
  targetDate?:  string | null
  badgeId?:     string | null
  isRepeatable?: boolean
}): Promise<{ ok: true; challenge: Challenge } | { ok: false; error: string }> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Judul challenge wajib diisi.' }
  if (input.targetValue <= 0) return { ok: false, error: 'Target value harus lebih dari 0.' }

  return withTenant(input.tenantId, async (tx) => {
    const [ch] = await tx.insert(challenges).values({
      tenantId:     input.tenantId,
      title,
      description:  input.description ?? null,
      metricType:   input.metricType,
      targetValue:  String(input.targetValue),
      targetDate:   input.targetDate ?? null,
      badgeId:      input.badgeId ?? null,
      isRepeatable: input.isRepeatable ?? false,
      createdBy:    input.userId,
    }).returning()
    return { ok: true as const, challenge: ch! }
  })
}

export async function assignChallenge(input: {
  tenantId:    string
  employeeId:  string
  challengeId: string
  assignedBy:  string
  notes?:      string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const existing = await tx.select({ id: employeeChallenges.id })
      .from(employeeChallenges)
      .where(and(
        eq(employeeChallenges.employeeId, input.employeeId),
        eq(employeeChallenges.challengeId, input.challengeId),
        eq(employeeChallenges.status, 'active'),
      ))
      .limit(1)
    if (existing.length > 0) return { ok: false, error: 'Challenge sudah diberikan ke karyawan ini.' }

    await tx.insert(employeeChallenges).values({
      tenantId:    input.tenantId,
      employeeId:  input.employeeId,
      challengeId: input.challengeId,
      assignedBy:  input.assignedBy,
      notes:       input.notes ?? null,
    })
    return { ok: true as const }
  })
}

export async function updateProgress(input: {
  tenantId:    string
  employeeId:  string
  challengeId: string
  progress:    number
}): Promise<{ ok: true; completed: boolean } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const [ec] = await tx.select()
      .from(employeeChallenges)
      .where(and(
        eq(employeeChallenges.employeeId, input.employeeId),
        eq(employeeChallenges.challengeId, input.challengeId),
      ))
      .limit(1)
    if (!ec) return { ok: false, error: 'Enrollment tidak ditemukan.' }

    const [ch] = await tx.select().from(challenges)
      .where(eq(challenges.id, input.challengeId)).limit(1)
    if (!ch) return { ok: false, error: 'Challenge tidak ditemukan.' }

    const completed = input.progress >= Number(ch.targetValue)
    await tx.update(employeeChallenges)
      .set({
        currentProgress: String(input.progress),
        status:          completed ? 'completed' : 'active',
        completedAt:     completed ? new Date() : null,
      })
      .where(eq(employeeChallenges.id, ec.id))

    // Auto-award badge if challenge has one and was just completed
    if (completed && ch.badgeId && ec.status !== 'completed') {
      await tx.insert(employeeBadges).values({
        tenantId:    input.tenantId,
        employeeId:  input.employeeId,
        badgeId:     ch.badgeId,
        challengeId: input.challengeId,
        reason:      `Menyelesaikan challenge: ${ch.title}`,
      })
    }

    return { ok: true as const, completed }
  })
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(tenantId: string, limit = 10) {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        employeeId:   employeeChallenges.employeeId,
        employeeName: employees.name,
        completed:    sql<number>`COUNT(*) FILTER (WHERE ${employeeChallenges.status} = 'completed')`,
        badges:       sql<number>`COUNT(DISTINCT ${employeeBadges.id})`,
      })
      .from(employeeChallenges)
      .leftJoin(employees, eq(employeeChallenges.employeeId, employees.id))
      .leftJoin(employeeBadges, eq(employeeChallenges.employeeId, employeeBadges.employeeId))
      .where(eq(employeeChallenges.tenantId, tenantId))
      .groupBy(employeeChallenges.employeeId, employees.name)
      .orderBy(desc(sql`COUNT(*) FILTER (WHERE ${employeeChallenges.status} = 'completed')`))
      .limit(limit)
    return rows
  })
}

// ── Goal History ──────────────────────────────────────────────────────────────

export async function recordGoalHistory(input: {
  tenantId:       string
  employeeId:     string
  challengeId?:   string | null
  challengeTitle: string
  result:         GoalResult
  period:         string
  finalProgress:  number
  targetValue:    number
  reviewedBy:     string
  reviewNotes?:   string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    await tx.insert(goalHistory).values({
      tenantId:       input.tenantId,
      employeeId:     input.employeeId,
      challengeId:    input.challengeId ?? null,
      challengeTitle: input.challengeTitle,
      result:         input.result,
      period:         input.period,
      finalProgress:  String(input.finalProgress),
      targetValue:    String(input.targetValue),
      reviewedBy:     input.reviewedBy,
      reviewNotes:    input.reviewNotes ?? null,
      reviewedAt:     new Date(),
    })
    return { ok: true as const }
  })
}

export async function getEmployeeGoalHistory(tenantId: string, employeeId: string) {
  return withTenant(tenantId, (tx) =>
    tx.select().from(goalHistory)
      .where(and(eq(goalHistory.tenantId, tenantId), eq(goalHistory.employeeId, employeeId)))
      .orderBy(desc(goalHistory.recordedAt))
  )
}
