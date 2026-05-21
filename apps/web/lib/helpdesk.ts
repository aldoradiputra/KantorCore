import 'server-only'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { withTenant } from './db'
import {
  hdTickets,
  hdTicketMessages,
  hdTeams,
  hdTeamMembers,
} from '@kantorcore/db'
import type {
  HdTicket, NewHdTicket,
  HdTicketMessage, NewHdTicketMessage,
  HdTeam,
  TicketStatus, TicketPriority,
} from '@kantorcore/db'

export type { HdTicket, HdTicketMessage, HdTeam, TicketStatus, TicketPriority }

// ── SLA durations by priority (hours) ────────────────────────────────────────

const SLA_HOURS: Record<TicketPriority, number> = {
  low:    72,
  medium: 24,
  high:   8,
  urgent: 2,
}

function slaDeadline(priority: TicketPriority): Date {
  const ms = SLA_HOURS[priority] * 60 * 60 * 1000
  return new Date(Date.now() + ms)
}

// ── Ticket number ─────────────────────────────────────────────────────────────

async function nextTicketNumber(tenantId: string): Promise<string> {
  // Use a per-tenant sequence approximation — nextval from shared seq,
  // formatted with tenant prefix.
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
  data: Omit<NewHdTicket, 'tenantId' | 'ticketNumber' | 'slaDueAt'>,
): Promise<HdTicket> {
  const ticketNumber = await nextTicketNumber(tenantId)
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .insert(hdTickets)
      .values({
        ...data,
        tenantId,
        ticketNumber,
        slaDueAt: slaDeadline(data.priority ?? 'medium'),
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
    // Auto-set closedAt when status transitions to resolved/closed
    const extra: Partial<HdTicket> = {}
    if ((patch.status === 'resolved' || patch.status === 'closed') && !patch.closedAt) {
      extra.closedAt = new Date()
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

    // Set firstReplyAt on ticket if this is an internal agent's first reply
    if (data.authorUserId) {
      await db
        .update(hdTickets)
        .set({
          firstReplyAt: sql`COALESCE(first_reply_at, NOW())`,
          status: sql`CASE WHEN status = 'new' THEN 'open'::hd.ticket_status ELSE status END`,
          updatedAt: new Date(),
        })
        .where(and(eq(hdTickets.id, data.ticketId), eq(hdTickets.tenantId, tenantId)))
    } else {
      // Customer reply — reopen pending tickets
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
