import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { recordEvents, users } from '@kantorcore/db'
import type { RecordEvent, EventType, ChatterActivityType } from '@kantorcore/db'
import { withTenant } from './db'

export type { RecordEvent, EventType, ChatterActivityType }

export type RecordEventWithAuthor = RecordEvent & {
  authorEmail: string | null
}

// ── Entity type constants ──────────────────────────────────────────────────────
// Use these when calling chatter functions to avoid typos across modules.

export const ENTITY = {
  HD_TICKET:     'hd.ticket',
  CRM_DEAL:      'crm.deal',
  CRM_CONTACT:   'crm.contact',
  FIN_INVOICE:   'fin.invoice',
  FIN_BILL:      'fin.bill',
  SALES_ORDER:   'sales.order',
  PROC_ORDER:    'proc.order',
  HR_EMPLOYEE:   'hr.employee',
  INV_PRODUCT:   'inv.product',
  PROJ_PROJECT:  'proj.project',
} as const

export type EntityType = typeof ENTITY[keyof typeof ENTITY]

// ── Queries ────────────────────────────────────────────────────────────────────

export async function listEvents(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<RecordEventWithAuthor[]> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ event: recordEvents, authorEmail: users.email })
      .from(recordEvents)
      .leftJoin(users, eq(users.id, recordEvents.authorUserId))
      .where(and(
        eq(recordEvents.tenantId, tenantId),
        eq(recordEvents.entityType, entityType),
        eq(recordEvents.entityId, entityId),
      ))
      .orderBy(asc(recordEvents.createdAt))
    return rows.map(({ event, authorEmail }) => ({ ...event, authorEmail }))
  })
}

export async function listPendingActivities(
  tenantId: string,
  entityType?: string,
): Promise<RecordEventWithAuthor[]> {
  return withTenant(tenantId, async (tx) => {
    const whereClauses = [
      eq(recordEvents.tenantId, tenantId),
      eq(recordEvents.eventType, 'activity_scheduled'),
      isNull(recordEvents.activityDoneAt),
    ]
    if (entityType) whereClauses.push(eq(recordEvents.entityType, entityType))

    const rows = await tx
      .select({ event: recordEvents, authorEmail: users.email })
      .from(recordEvents)
      .leftJoin(users, eq(users.id, recordEvents.authorUserId))
      .where(and(...whereClauses))
      .orderBy(asc(recordEvents.activityDue))

    return rows.map(({ event, authorEmail }) => ({ ...event, authorEmail }))
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type LogNoteInput = {
  entityType: string
  entityId: string
  body: string
  bodyHtml?: string | null
  authorUserId: string
  authorName: string
}

export async function logNote(tenantId: string, input: LogNoteInput): Promise<RecordEvent> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(recordEvents).values({
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'log_note',
      isInternal: true,
      body: input.body,
      bodyHtml: input.bodyHtml ?? null,
      authorUserId: input.authorUserId,
      authorName: input.authorName,
    }).returning(),
  )
  return row
}

export type SendEmailInput = {
  entityType: string
  entityId: string
  subject: string
  body: string
  bodyHtml?: string | null
  toAddrs: string[]
  ccAddrs?: string[]
  authorUserId: string
  authorName: string
  emailMessageId?: string | null
}

export async function recordSentEmail(tenantId: string, input: SendEmailInput): Promise<RecordEvent> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(recordEvents).values({
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'send_email',
      isInternal: false,
      subject: input.subject,
      body: input.body,
      bodyHtml: input.bodyHtml ?? null,
      toAddrs: input.toAddrs,
      ccAddrs: input.ccAddrs ?? [],
      authorUserId: input.authorUserId,
      authorName: input.authorName,
      emailMessageId: input.emailMessageId ?? null,
    }).returning(),
  )
  return row
}

export type ScheduleActivityInput = {
  entityType: string
  entityId: string
  activityType: ChatterActivityType
  activityDue: Date
  body?: string | null
  authorUserId: string
  authorName: string
}

export async function scheduleActivity(tenantId: string, input: ScheduleActivityInput): Promise<RecordEvent> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(recordEvents).values({
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'activity_scheduled',
      isInternal: true,
      activityType: input.activityType,
      activityDue: input.activityDue,
      body: input.body ?? null,
      authorUserId: input.authorUserId,
      authorName: input.authorName,
    }).returning(),
  )
  return row
}

export async function markActivityDone(
  tenantId: string,
  eventId: string,
  note?: string | null,
): Promise<RecordEvent> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.update(recordEvents)
      .set({
        eventType: 'activity_done',
        activityDoneAt: new Date(),
        ...(note ? { body: note } : {}),
      })
      .where(and(
        eq(recordEvents.tenantId, tenantId),
        eq(recordEvents.id, eventId),
      ))
      .returning(),
  )
  return row
}
