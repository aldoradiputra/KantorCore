import {
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'

export const recordEvents = platform.table('record_events', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  entityType:      text('entity_type').notNull(),
  entityId:        uuid('entity_id').notNull(),

  eventType:       text('event_type').notNull(),
  isInternal:      boolean('is_internal').notNull().default(true),

  subject:         text('subject'),
  body:            text('body'),
  bodyHtml:        text('body_html'),

  authorUserId:    uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  authorName:      text('author_name').notNull().default(''),

  toAddrs:         text('to_addrs').array().notNull().default([] as unknown as string[]),
  ccAddrs:         text('cc_addrs').array().notNull().default([] as unknown as string[]),
  emailMessageId:  text('email_message_id'),

  activityType:    text('activity_type'),
  activityDue:     timestamp('activity_due', { withTimezone: true }),
  activityDoneAt:  timestamp('activity_done_at', { withTimezone: true }),

  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entityIdx: index('record_events_entity_idx').on(t.tenantId, t.entityType, t.entityId, t.createdAt),
}))

export type RecordEvent = typeof recordEvents.$inferSelect
export type NewRecordEvent = typeof recordEvents.$inferInsert

export type EventType = 'log_note' | 'send_email' | 'activity_scheduled' | 'activity_done'
export type ChatterActivityType = 'call' | 'meeting' | 'todo' | 'email' | 'deadline'
