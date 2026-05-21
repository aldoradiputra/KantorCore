import {
  pgSchema,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'

export const hdSchema = pgSchema('hd')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ticketStatus = pgEnum('ticket_status', [
  'new', 'open', 'pending', 'resolved', 'closed',
])

export const ticketPriority = pgEnum('ticket_priority', [
  'low', 'medium', 'high', 'urgent',
])

export const ticketSource = pgEnum('ticket_source', [
  'portal', 'email', 'chat', 'phone', 'manual',
])

// ── Teams ─────────────────────────────────────────────────────────────────────

export const hdTeams = hdSchema.table('teams', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('hd_teams_tenant_idx').on(t.tenantId),
}))

export type HdTeam = typeof hdTeams.$inferSelect

// ── Team Members ──────────────────────────────────────────────────────────────

export const hdTeamMembers = hdSchema.table('team_members', {
  id:       uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  teamId:   uuid('team_id').notNull().references(() => hdTeams.id, { onDelete: 'cascade' }),
  userId:   uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => ({
  teamUserUniq: unique('hd_team_members_uniq').on(t.teamId, t.userId),
  teamIdx:      index('hd_team_members_team_idx').on(t.teamId),
  userIdx:      index('hd_team_members_user_idx').on(t.userId),
}))

// ── Tickets ───────────────────────────────────────────────────────────────────

export const hdTickets = hdSchema.table('tickets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ticketNumber:   varchar('ticket_number', { length: 32 }).notNull(),
  subject:        text('subject').notNull(),
  status:         ticketStatus('status').notNull().default('new'),
  priority:       ticketPriority('priority').notNull().default('medium'),
  source:         ticketSource('source').notNull().default('manual'),
  contactId:      uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  reporterName:   text('reporter_name'),
  reporterEmail:  text('reporter_email'),
  teamId:         uuid('team_id').references(() => hdTeams.id, { onDelete: 'set null' }),
  assigneeId:     uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  closedAt:       timestamp('closed_at'),
  firstReplyAt:   timestamp('first_reply_at'),
  slaDueAt:       timestamp('sla_due_at'),
  createdBy:      uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:       index('hd_tickets_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('hd_tickets_tenant_status_idx').on(t.tenantId, t.status),
  assigneeIdx:     index('hd_tickets_assignee_idx').on(t.assigneeId),
  contactIdx:      index('hd_tickets_contact_idx').on(t.contactId),
}))

export type HdTicket = typeof hdTickets.$inferSelect
export type NewHdTicket = typeof hdTickets.$inferInsert
export type TicketStatus = (typeof ticketStatus.enumValues)[number]
export type TicketPriority = (typeof ticketPriority.enumValues)[number]
export type TicketSource = (typeof ticketSource.enumValues)[number]

// ── Ticket Messages ────────────────────────────────────────────────────────────

export const hdTicketMessages = hdSchema.table('ticket_messages', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ticketId:         uuid('ticket_id').notNull().references(() => hdTickets.id, { onDelete: 'cascade' }),
  body:             text('body').notNull(),
  authorUserId:     uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  authorContactId:  uuid('author_contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  authorName:       text('author_name').notNull(),
  isInternal:       boolean('is_internal').notNull().default(false),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  ticketIdx: index('hd_messages_ticket_idx').on(t.ticketId),
  tenantIdx: index('hd_messages_tenant_idx').on(t.tenantId),
}))

export type HdTicketMessage = typeof hdTicketMessages.$inferSelect
export type NewHdTicketMessage = typeof hdTicketMessages.$inferInsert
