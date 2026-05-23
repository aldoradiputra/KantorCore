import { eq, and, asc, desc, sql } from 'drizzle-orm'
import { withTenant } from './db'
import {
  hdTickets,
  hdTicketMessages,
  hdTeams,
  hdTeamMembers,
  hdSlaPolicies,
  hdEmailAliases,
  hdTicketActions,
} from '@kantorcore/db'
import type {
  HdTicket, NewHdTicket,
  HdTicketMessage, NewHdTicketMessage,
  HdTeam,
  HdSlaPolicy, NewHdSlaPolicy,
  HdEmailAlias,
  HdTicketAction, TicketActionType,
  TicketStatus, TicketPriority, TicketSource,
  SlaPolicyConditions,
} from '@kantorcore/db'

export type {
  HdTicket, HdTicketMessage, HdTeam,
  HdSlaPolicy, HdEmailAlias, HdTicketAction,
  TicketStatus, TicketPriority, TicketSource, TicketActionType,
  SlaPolicyConditions,
}

// ── SLA policy resolution ─────────────────────────────────────────────────────
// Evaluates policies in priority_order ASC; returns the first match.
// Falls back to sensible defaults if no policy matches.

const DEFAULT_RESPONSE_MINUTES: Record<TicketPriority, number> = {
  low:    72 * 60,
  medium: 24 * 60,
  high:   8  * 60,
  urgent: 2  * 60,
}

export async function resolveSlaPolicy(
  tenantId: string,
  opts: { priority: TicketPriority; teamId?: string | null; source?: TicketSource; tags?: string[] },
): Promise<{ policy: HdSlaPolicy | null; slaDueAt: Date; responseTargetMinutes: number }> {
  const policies = await listSlaPolicies(tenantId)

  for (const p of policies) {
    if (!p.active) continue
    const cond = p.conditions as SlaPolicyConditions
    if (cond.priority && cond.priority !== opts.priority) continue
    if (cond.teamId && cond.teamId !== opts.teamId) continue
    if (cond.source && cond.source !== opts.source) continue
    if (cond.tags?.length) {
      const ticketTags = opts.tags ?? []
      if (!cond.tags.some((t) => ticketTags.includes(t))) continue
    }
    // Matched
    const slaDueAt = new Date(Date.now() + p.resolutionTargetMinutes * 60_000)
    return { policy: p, slaDueAt, responseTargetMinutes: p.responseTargetMinutes }
  }

  // No policy matched — use priority-based defaults
  const minutes = DEFAULT_RESPONSE_MINUTES[opts.priority]
  const slaDueAt = new Date(Date.now() + minutes * 60_000)
  return { policy: null, slaDueAt, responseTargetMinutes: minutes }
}

// ── Ticket number ─────────────────────────────────────────────────────────────

async function nextTicketNumber(tenantId: string): Promise<string> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.execute<{ n: string }>(
      sql`SELECT nextval('hd.ticket_seq')::text AS n`,
    )
    const n = row?.n ?? String(Date.now())
    return `HD-${n.padStart(5, '0')}`
  })
}

// ── Tickets CRUD ──────────────────────────────────────────────────────────────

export interface TicketFilters {
  status?: TicketStatus
  assigneeId?: string
  teamId?: string
  search?: string
  limit?: number
}

export async function listTickets(tenantId: string, filters: TicketFilters = {}) {
  return withTenant(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(hdTickets)
      .where(
        filters.status
          ? and(eq(hdTickets.tenantId, tenantId), eq(hdTickets.status, filters.status))
          : eq(hdTickets.tenantId, tenantId),
      )
      .orderBy(desc(hdTickets.updatedAt))
      .limit(filters.limit ?? 200)

    let filtered = rows
    if (filters.assigneeId) filtered = filtered.filter((t) => t.assigneeId === filters.assigneeId)
    if (filters.teamId) filtered = filtered.filter((t) => t.teamId === filters.teamId)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (t) => t.subject.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q),
      )
    }
    return filtered
  })
}

export async function getTicket(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .select()
      .from(hdTickets)
      .where(and(eq(hdTickets.id, id), eq(hdTickets.tenantId, tenantId)))
    return row ?? null
  })
}

export async function createTicket(
  tenantId: string,
  data: Omit<NewHdTicket, 'tenantId' | 'ticketNumber' | 'slaDueAt' | 'slaPolicyId'>,
): Promise<HdTicket> {
  const ticketNumber = await nextTicketNumber(tenantId)
  const { policy, slaDueAt } = await resolveSlaPolicy(tenantId, {
    priority: data.priority ?? 'medium',
    teamId: data.teamId,
    source: data.source,
  })

  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .insert(hdTickets)
      .values({
        ...data,
        tenantId,
        ticketNumber,
        slaDueAt,
        slaPolicyId: policy?.id ?? null,
      })
      .returning()
    return row!
  })
}

export async function updateTicket(
  tenantId: string,
  id: string,
  patch: Partial<Omit<NewHdTicket, 'tenantId' | 'id'>>,
) {
  return withTenant(tenantId, async (db) => {
    const extra: Partial<HdTicket> = {}
    if (patch.status === 'resolved' || patch.status === 'closed') {
      if (!patch.closedAt) extra.closedAt = new Date()
      if (!patch.resolvedAt) extra.resolvedAt = new Date()
    }
    const [row] = await db
      .update(hdTickets)
      .set({ ...patch, ...extra, updatedAt: new Date() })
      .where(and(eq(hdTickets.id, id), eq(hdTickets.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

export async function deleteTicket(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    await db.delete(hdTickets).where(and(eq(hdTickets.id, id), eq(hdTickets.tenantId, tenantId)))
  })
}

// ── Ticket Messages ────────────────────────────────────────────────────────────

export async function listMessages(tenantId: string, ticketId: string, includeInternal = true) {
  return withTenant(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(hdTicketMessages)
      .where(and(eq(hdTicketMessages.ticketId, ticketId), eq(hdTicketMessages.tenantId, tenantId)))
      .orderBy(hdTicketMessages.createdAt)
    return includeInternal ? rows : rows.filter((m) => !m.isInternal)
  })
}

export async function addMessage(
  tenantId: string,
  data: Omit<NewHdTicketMessage, 'tenantId'>,
): Promise<HdTicketMessage> {
  return withTenant(tenantId, async (db) => {
    const [msg] = await db
      .insert(hdTicketMessages)
      .values({ ...data, tenantId })
      .returning()

    if (data.authorUserId) {
      // Agent reply: set firstReplyAt, transition new→open
      await db
        .update(hdTickets)
        .set({
          firstReplyAt: sql`COALESCE(first_reply_at, NOW())`,
          status: sql`CASE WHEN status = 'new' THEN 'open'::hd.ticket_status ELSE status END`,
          updatedAt: new Date(),
        })
        .where(and(eq(hdTickets.id, data.ticketId), eq(hdTickets.tenantId, tenantId)))
    } else {
      // Customer reply: reopen pending tickets
      await db
        .update(hdTickets)
        .set({
          status: sql`CASE WHEN status = 'pending' THEN 'open'::hd.ticket_status ELSE status END`,
          updatedAt: new Date(),
        })
        .where(and(eq(hdTickets.id, data.ticketId), eq(hdTickets.tenantId, tenantId)))
    }

    return msg!
  })
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function listTeams(tenantId: string): Promise<HdTeam[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(hdTeams).where(eq(hdTeams.tenantId, tenantId)).orderBy(hdTeams.name)
  })
}

export async function createTeam(tenantId: string, name: string, description?: string) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .insert(hdTeams)
      .values({ tenantId, name, description: description || null })
      .returning()
    return row!
  })
}

// ── SLA Policies ──────────────────────────────────────────────────────────────

export async function listSlaPolicies(tenantId: string): Promise<HdSlaPolicy[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(hdSlaPolicies)
      .where(eq(hdSlaPolicies.tenantId, tenantId))
      .orderBy(asc(hdSlaPolicies.priorityOrder))
  })
}

export async function createSlaPolicy(tenantId: string, data: Omit<NewHdSlaPolicy, 'tenantId'>): Promise<HdSlaPolicy> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.insert(hdSlaPolicies).values({ ...data, tenantId }).returning()
    return row!
  })
}

export async function updateSlaPolicy(tenantId: string, id: string, patch: Partial<Omit<NewHdSlaPolicy, 'tenantId' | 'id'>>): Promise<HdSlaPolicy | null> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.update(hdSlaPolicies)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(hdSlaPolicies.id, id), eq(hdSlaPolicies.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

export async function deleteSlaPolicy(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    await db.delete(hdSlaPolicies).where(and(eq(hdSlaPolicies.id, id), eq(hdSlaPolicies.tenantId, tenantId)))
  })
}

// ── Email Aliases ─────────────────────────────────────────────────────────────

export async function listEmailAliases(tenantId: string): Promise<HdEmailAlias[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(hdEmailAliases).where(eq(hdEmailAliases.tenantId, tenantId))
  })
}

export async function createEmailAlias(tenantId: string, alias: string, teamId?: string | null) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.insert(hdEmailAliases)
      .values({ tenantId, alias, teamId: teamId ?? null })
      .returning()
    return row!
  })
}

// ── Ticket Actions (cross-module) ─────────────────────────────────────────────

export async function listTicketActions(tenantId: string, ticketId: string): Promise<HdTicketAction[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(hdTicketActions)
      .where(and(eq(hdTicketActions.ticketId, ticketId), eq(hdTicketActions.tenantId, tenantId)))
      .orderBy(hdTicketActions.createdAt)
  })
}

export async function recordTicketAction(
  tenantId: string,
  ticketId: string,
  actionType: TicketActionType,
  actorId: string | null,
  payload: Record<string, unknown>,
): Promise<HdTicketAction> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.insert(hdTicketActions)
      .values({ tenantId, ticketId, actionType, actorId, payload })
      .returning()
    return row!
  })
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export interface TicketStats {
  total: number
  byStatus: Record<TicketStatus, number>
  overdueCount: number
}

export async function getTicketStats(tenantId: string): Promise<TicketStats> {
  const rows = await listTickets(tenantId, { limit: 2000 })
  const now = new Date()
  const byStatus = { new: 0, open: 0, pending: 0, resolved: 0, closed: 0 } as Record<TicketStatus, number>
  let overdueCount = 0
  for (const t of rows) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
    if (t.slaDueAt && t.slaDueAt < now && t.status !== 'resolved' && t.status !== 'closed') {
      overdueCount++
    }
  }
  return { total: rows.length, byStatus, overdueCount }
}
