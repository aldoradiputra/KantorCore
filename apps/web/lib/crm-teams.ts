import 'server-only'
import { and, eq, desc, sql, inArray, isNull } from 'drizzle-orm'
import {
  salesTeams, salesTeamMembers, assignmentRules, leads, deals, users,
  type SalesTeam, type SalesTeamMember, type AssignmentRule, type Lead, type LeadStatus,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { SalesTeam, SalesTeamMember, AssignmentRule, Lead, LeadStatus }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeamMemberWithStats {
  userId: string
  userName: string
  userEmail: string
  role: string
  personalTargetRevenue: number | null
  assignedLeads: number
  activeDeals: number
  wonDeals: number
  wonRevenue: number
}

export interface TeamWithMembers extends SalesTeam {
  leaderName: string | null
  members: TeamMemberWithStats[]
}

export interface AssignmentCondition {
  field: 'location' | 'employee_count' | 'industry' | 'utm_source'
  operator: 'equals' | 'contains' | 'gte' | 'lte' | 'range'
  value: string | number | [number, number]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextLeadNumber(tx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), sql`EXTRACT(YEAR FROM created_at) = ${year}`))
  return `LEAD/${year}/${String(count + 1).padStart(4, '0')}`
}

// ── Sales Team CRUD ───────────────────────────────────────────────────────────

export async function listTeams(tenantId: string): Promise<TeamWithMembers[]> {
  return withTenant(tenantId, async (tx) => {
    const teams = await tx
      .select()
      .from(salesTeams)
      .where(and(eq(salesTeams.tenantId, tenantId), eq(salesTeams.active, true)))
      .orderBy(salesTeams.name)

    if (teams.length === 0) return []

    const teamIds = teams.map((t) => t.id)

    const memberRows = await tx
      .select({
        member: salesTeamMembers,
        userName:  users.name,
        userEmail: users.email,
      })
      .from(salesTeamMembers)
      .innerJoin(users, eq(salesTeamMembers.userId, users.id))
      .where(and(inArray(salesTeamMembers.teamId, teamIds), eq(salesTeamMembers.active, true)))

    const leaderIds = teams.map((t) => t.leaderId).filter(Boolean) as string[]
    const leaderMap = new Map<string, string>()
    if (leaderIds.length > 0) {
      const leaders = await tx
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, leaderIds))
      leaders.forEach((l) => leaderMap.set(l.id, l.name))
    }

    const memberUserIds = memberRows.map((r) => r.member.userId)

    // Active deals count per user per team
    const dealStats = memberUserIds.length > 0
      ? await tx
          .select({
            assignedTo: deals.assignedTo,
            teamId:     deals.teamId,
            stage:      deals.stage,
            count:      sql<number>`count(*)::int`,
            revenue:    sql<number>`COALESCE(SUM(expected_value), 0)::int`,
          })
          .from(deals)
          .where(and(eq(deals.tenantId, tenantId), inArray(deals.assignedTo, memberUserIds), isNull(deals.deletedAt)))
          .groupBy(deals.assignedTo, deals.teamId, deals.stage)
      : []

    // Assigned leads count per user
    const leadStats = memberUserIds.length > 0
      ? await tx
          .select({
            assignedTo: leads.assignedTo,
            assignedTeamId: leads.assignedTeamId,
            count: sql<number>`count(*)::int`,
          })
          .from(leads)
          .where(and(eq(leads.tenantId, tenantId), inArray(leads.assignedTo, memberUserIds), isNull(leads.deletedAt)))
          .groupBy(leads.assignedTo, leads.assignedTeamId)
      : []

    return teams.map((team) => {
      const members: TeamMemberWithStats[] = memberRows
        .filter((r) => r.member.teamId === team.id)
        .map((r) => {
          const uid = r.member.userId
          const tid = team.id

          const activeDeals = dealStats
            .filter((d) => d.assignedTo === uid && d.teamId === tid && d.stage !== 'won' && d.stage !== 'lost')
            .reduce((s, d) => s + d.count, 0)
          const wonDeals = dealStats
            .filter((d) => d.assignedTo === uid && d.teamId === tid && d.stage === 'won')
            .reduce((s, d) => s + d.count, 0)
          const wonRevenue = dealStats
            .filter((d) => d.assignedTo === uid && d.teamId === tid && d.stage === 'won')
            .reduce((s, d) => s + d.revenue, 0)
          const assignedLeads = leadStats
            .filter((l) => l.assignedTo === uid && l.assignedTeamId === tid)
            .reduce((s, l) => s + l.count, 0)

          return {
            userId:                uid,
            userName:              r.userName,
            userEmail:             r.userEmail,
            role:                  r.member.role,
            personalTargetRevenue: r.member.personalTargetRevenue ?? null,
            assignedLeads,
            activeDeals,
            wonDeals,
            wonRevenue,
          }
        })

      return {
        ...team,
        leaderName: team.leaderId ? (leaderMap.get(team.leaderId) ?? null) : null,
        members,
      }
    })
  })
}

export async function getTeam(tenantId: string, teamId: string): Promise<TeamWithMembers | null> {
  const all = await listTeams(tenantId)
  return all.find((t) => t.id === teamId) ?? null
}

export async function createTeam(input: {
  tenantId: string
  name: string
  description?: string | null
  leaderId?: string | null
  targetRevenue?: number
  targetDealCount?: number
  assignmentFrequency?: 'daily' | 'weekly' | 'monthly'
}): Promise<{ ok: true; team: SalesTeam } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: 'Nama tim wajib diisi.' }
  return withTenant(input.tenantId, async (tx) => {
    const [team] = await tx
      .insert(salesTeams)
      .values({
        tenantId:            input.tenantId,
        name:                input.name.trim(),
        description:         input.description ?? null,
        leaderId:            input.leaderId ?? null,
        targetRevenue:       input.targetRevenue ?? 0,
        targetDealCount:     input.targetDealCount ?? 0,
        assignmentFrequency: input.assignmentFrequency ?? 'weekly',
      })
      .returning()

    // Auto-add leader as team member with role 'leader'
    if (input.leaderId) {
      await tx.insert(salesTeamMembers).values({
        teamId: team!.id,
        userId: input.leaderId,
        role:   'leader',
      }).onConflictDoUpdate({
        target: [salesTeamMembers.teamId, salesTeamMembers.userId],
        set:    { role: 'leader', active: true },
      })
    }

    return { ok: true as const, team: team! }
  })
}

export async function updateTeam(
  tenantId: string,
  teamId: string,
  input: Partial<{
    name: string
    description: string | null
    leaderId: string | null
    targetRevenue: number
    targetDealCount: number
    assignmentFrequency: 'daily' | 'weekly' | 'monthly'
  }>,
): Promise<{ ok: true; team: SalesTeam } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: salesTeams.id })
      .from(salesTeams)
      .where(and(eq(salesTeams.id, teamId), eq(salesTeams.tenantId, tenantId)))
      .limit(1)
    if (!existing) return { ok: false as const, error: 'Tim tidak ditemukan.' }

    const [updated] = await tx
      .update(salesTeams)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(salesTeams.id, teamId))
      .returning()

    return { ok: true as const, team: updated! }
  })
}

// ── Team Members ──────────────────────────────────────────────────────────────

export async function addTeamMember(input: {
  tenantId: string
  teamId: string
  userId: string
  role?: 'leader' | 'member'
  personalTargetRevenue?: number | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const [team] = await tx
      .select({ id: salesTeams.id })
      .from(salesTeams)
      .where(and(eq(salesTeams.id, input.teamId), eq(salesTeams.tenantId, input.tenantId)))
      .limit(1)
    if (!team) return { ok: false as const, error: 'Tim tidak ditemukan.' }

    await tx
      .insert(salesTeamMembers)
      .values({
        teamId:                input.teamId,
        userId:                input.userId,
        role:                  input.role ?? 'member',
        personalTargetRevenue: input.personalTargetRevenue ?? null,
      })
      .onConflictDoUpdate({
        target: [salesTeamMembers.teamId, salesTeamMembers.userId],
        set:    { role: input.role ?? 'member', active: true, personalTargetRevenue: input.personalTargetRevenue ?? null },
      })

    return { ok: true as const }
  })
}

export async function removeTeamMember(
  tenantId: string,
  teamId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    await tx
      .update(salesTeamMembers)
      .set({ active: false })
      .where(and(eq(salesTeamMembers.teamId, teamId), eq(salesTeamMembers.userId, userId)))
    return { ok: true as const }
  })
}

// ── Assignment Rules ──────────────────────────────────────────────────────────

export async function listAssignmentRules(tenantId: string, teamId: string): Promise<AssignmentRule[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(assignmentRules).where(
      and(eq(assignmentRules.tenantId, tenantId), eq(assignmentRules.teamId, teamId))
    ).orderBy(desc(assignmentRules.createdAt))
  )
}

export async function createAssignmentRule(input: {
  tenantId: string
  teamId: string
  name: string
  ruleType: 'round_robin' | 'load_balanced' | 'rule_based' | 'manual'
  conditions?: AssignmentCondition[]
  eligibleMemberIds?: string[]
  createdBy: string
}): Promise<{ ok: true; rule: AssignmentRule } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: 'Nama aturan wajib diisi.' }
  return withTenant(input.tenantId, async (tx) => {
    const [rule] = await tx
      .insert(assignmentRules)
      .values({
        tenantId:          input.tenantId,
        teamId:            input.teamId,
        name:              input.name.trim(),
        ruleType:          input.ruleType,
        conditions:        { conditions: input.conditions ?? [], logic: 'AND' },
        eligibleMemberIds: input.eligibleMemberIds ?? [],
        createdBy:         input.createdBy,
      })
      .returning()
    return { ok: true as const, rule: rule! }
  })
}

// ── Lead Assignment Engine ────────────────────────────────────────────────────

function matchesConditions(lead: Lead, conditions: AssignmentCondition[]): boolean {
  return conditions.every((cond) => {
    const fieldValue = (() => {
      switch (cond.field) {
        case 'location':      return lead.location?.toLowerCase() ?? ''
        case 'industry':      return lead.industry?.toLowerCase() ?? ''
        case 'utm_source':    return lead.utmSource?.toLowerCase() ?? ''
        case 'employee_count': return lead.employeeCount ?? 0
      }
    })()

    switch (cond.operator) {
      case 'equals':   return String(fieldValue) === String(cond.value)
      case 'contains': return String(fieldValue).includes(String(cond.value).toLowerCase())
      case 'gte':      return Number(fieldValue) >= Number(cond.value)
      case 'lte':      return Number(fieldValue) <= Number(cond.value)
      case 'range': {
        const [min, max] = cond.value as [number, number]
        const n = Number(fieldValue)
        return n >= min && n <= max
      }
      default: return true
    }
  })
}

export async function runAssignment(
  tenantId: string,
  teamId: string,
  ruleId?: string,
): Promise<{ ok: true; assigned: number } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    // Get team members
    const members = await tx
      .select({ userId: salesTeamMembers.userId })
      .from(salesTeamMembers)
      .where(and(eq(salesTeamMembers.teamId, teamId), eq(salesTeamMembers.active, true)))

    if (members.length === 0) return { ok: false as const, error: 'Tim tidak memiliki anggota aktif.' }

    // Get unassigned leads for this team
    const unassigned = await tx
      .select()
      .from(leads)
      .where(and(
        eq(leads.tenantId, tenantId),
        eq(leads.assignedTeamId, teamId),
        isNull(leads.assignedTo),
        isNull(leads.deletedAt),
      ))

    if (unassigned.length === 0) return { ok: true as const, assigned: 0 }

    let rule: AssignmentRule | null = null
    if (ruleId) {
      const [r] = await tx.select().from(assignmentRules).where(eq(assignmentRules.id, ruleId)).limit(1)
      rule = r ?? null
    } else {
      const [r] = await tx
        .select()
        .from(assignmentRules)
        .where(and(eq(assignmentRules.teamId, teamId), eq(assignmentRules.isActive, true)))
        .limit(1)
      rule = r ?? null
    }

    const eligibleMemberIds = rule?.eligibleMemberIds as string[] | null
    const eligibleMembers = eligibleMemberIds?.length
      ? members.filter((m) => eligibleMemberIds.includes(m.userId))
      : members

    if (eligibleMembers.length === 0) return { ok: false as const, error: 'Tidak ada anggota yang memenuhi syarat.' }

    // Load-balanced: get current assignment counts
    const loadMap = new Map<string, number>()
    if (rule?.ruleType === 'load_balanced') {
      const counts = await tx
        .select({ assignedTo: leads.assignedTo, count: sql<number>`count(*)::int` })
        .from(leads)
        .where(and(
          eq(leads.tenantId, tenantId),
          eq(leads.assignedTeamId, teamId),
          inArray(leads.assignedTo, eligibleMembers.map((m) => m.userId)),
          isNull(leads.deletedAt),
        ))
        .groupBy(leads.assignedTo)
      counts.forEach((c) => { if (c.assignedTo) loadMap.set(c.assignedTo, c.count) })
    }

    const conditions = (rule?.conditions as { conditions?: AssignmentCondition[]; logic?: string } | null)
      ?.conditions ?? []

    let roundRobinIndex = 0
    let assigned = 0

    for (const lead of unassigned) {
      // Rule-based: filter conditions first
      if (rule?.ruleType === 'rule_based' && conditions.length > 0) {
        if (!matchesConditions(lead, conditions)) continue
      }

      let targetUserId: string

      if (rule?.ruleType === 'load_balanced') {
        // Assign to member with fewest leads
        const sorted = [...eligibleMembers].sort((a, b) =>
          (loadMap.get(a.userId) ?? 0) - (loadMap.get(b.userId) ?? 0)
        )
        targetUserId = sorted[0]!.userId
        loadMap.set(targetUserId, (loadMap.get(targetUserId) ?? 0) + 1)
      } else {
        // Round-robin (default)
        targetUserId = eligibleMembers[roundRobinIndex % eligibleMembers.length]!.userId
        roundRobinIndex++
      }

      await tx
        .update(leads)
        .set({ assignedTo: targetUserId, assignedAt: new Date(), assignmentRuleId: rule?.id ?? null })
        .where(eq(leads.id, lead.id))

      assigned++
    }

    if (rule) {
      await tx
        .update(assignmentRules)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(assignmentRules.id, rule.id))
    }

    return { ok: true as const, assigned }
  })
}

// ── Leads CRUD ────────────────────────────────────────────────────────────────

export async function listLeads(
  tenantId: string,
  opts: {
    teamId?: string
    assignedTo?: string
    status?: LeadStatus
    limit?: number
    offset?: number
  } = {},
): Promise<{ leads: Lead[]; total: number }> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(leads.tenantId, tenantId), isNull(leads.deletedAt)]
    if (opts.teamId)    conditions.push(eq(leads.assignedTeamId, opts.teamId))
    if (opts.assignedTo) conditions.push(eq(leads.assignedTo, opts.assignedTo))
    if (opts.status)    conditions.push(eq(leads.leadStatus, opts.status))

    const where = and(...conditions)!

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(leads)
      .where(where)

    const rows = await tx
      .select()
      .from(leads)
      .where(where)
      .orderBy(desc(leads.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0)

    return { leads: rows, total }
  })
}

export async function createLead(input: {
  tenantId: string
  userId: string
  firstName: string
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
  jobTitle?: string | null
  industry?: string | null
  employeeCount?: number | null
  location?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  tags?: string[]
  assignedTeamId?: string | null
  notes?: string | null
}): Promise<{ ok: true; lead: Lead } | { ok: false; error: string }> {
  if (!input.firstName.trim()) return { ok: false, error: 'Nama depan wajib diisi.' }
  return withTenant(input.tenantId, async (tx) => {
    const leadNumber = await nextLeadNumber(tx, input.tenantId)
    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId:      input.tenantId,
        leadNumber,
        firstName:     input.firstName.trim(),
        lastName:      input.lastName?.trim() ?? null,
        email:         input.email?.trim() ?? null,
        phone:         input.phone?.trim() ?? null,
        companyName:   input.companyName?.trim() ?? null,
        jobTitle:      input.jobTitle?.trim() ?? null,
        industry:      input.industry?.trim() ?? null,
        employeeCount: input.employeeCount ?? null,
        location:      input.location?.trim() ?? null,
        utmSource:     input.utmSource ?? null,
        utmMedium:     input.utmMedium ?? null,
        utmCampaign:   input.utmCampaign ?? null,
        tags:          input.tags ?? [],
        assignedTeamId: input.assignedTeamId ?? null,
        createdBy:     input.userId,
        notes:         input.notes?.trim() ?? null,
      })
      .returning()
    return { ok: true as const, lead: lead! }
  })
}

export async function updateLeadStatus(
  tenantId: string,
  leadId: string,
  status: LeadStatus,
): Promise<{ ok: true; lead: Lead } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [lead] = await tx
      .update(leads)
      .set({ leadStatus: status, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
      .returning()
    if (!lead) return { ok: false as const, error: 'Lead tidak ditemukan.' }
    return { ok: true as const, lead }
  })
}

// ── Team performance summary ──────────────────────────────────────────────────

export interface TeamPerformanceSummary {
  teamId: string
  totalLeads: number
  activeDeals: number
  wonDeals: number
  wonRevenue: number
  pipelineValue: number   // sum(expectedValue * probability/100) for open deals
  targetRevenue: number
  members: TeamMemberWithStats[]
}

export async function getTeamPerformance(
  tenantId: string,
  teamId: string,
): Promise<TeamPerformanceSummary | null> {
  const team = await getTeam(tenantId, teamId)
  if (!team) return null

  return withTenant(tenantId, async (tx) => {
    const [leadCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.assignedTeamId, teamId), isNull(leads.deletedAt)))

    const dealRows = await tx
      .select({
        stage:         deals.stage,
        count:         sql<number>`count(*)::int`,
        totalValue:    sql<number>`COALESCE(SUM(expected_value), 0)::int`,
        weightedValue: sql<number>`COALESCE(SUM(expected_value * probability / 100.0), 0)::int`,
      })
      .from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.teamId, teamId), isNull(deals.deletedAt)))
      .groupBy(deals.stage)

    const activeDeals = dealRows.filter((r) => r.stage !== 'won' && r.stage !== 'lost').reduce((s, r) => s + r.count, 0)
    const wonDeals    = dealRows.filter((r) => r.stage === 'won').reduce((s, r) => s + r.count, 0)
    const wonRevenue  = dealRows.filter((r) => r.stage === 'won').reduce((s, r) => s + r.totalValue, 0)
    const pipelineValue = dealRows.filter((r) => r.stage !== 'won' && r.stage !== 'lost').reduce((s, r) => s + r.weightedValue, 0)

    return {
      teamId,
      totalLeads:    leadCount?.count ?? 0,
      activeDeals,
      wonDeals,
      wonRevenue,
      pipelineValue,
      targetRevenue: team.targetRevenue,
      members:       team.members,
    }
  })
}
