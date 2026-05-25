import { uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'


/**
 * IS-CHAT / IS-PLAT — Real-time user presence (Phase 1).
 *
 * One row per (tenant, user) pair — upserted by the presence heartbeat worker
 * whenever the client sends a keepalive. Clients that miss two heartbeat
 * windows (30 s each) are flipped to 'offline' by the same worker.
 *
 * Status is an open varchar rather than an enum so that future states
 * ('busy', 'dnd', etc.) can be added without a migration.
 *
 * Valid values at launch: 'online' | 'away' | 'offline'
 */
export const userPresence = platform.table(
  'user_presence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'online' | 'away' | 'offline' */
    status: varchar('status', { length: 20 }).notNull().default('offline'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantUserUnique: uniqueIndex('user_presence_tenant_user_unique').on(t.tenantId, t.userId),
    tenantStatusIdx: index('user_presence_tenant_status_idx').on(t.tenantId, t.status),
  }),
)

export type UserPresence = typeof userPresence.$inferSelect
export type NewUserPresence = typeof userPresence.$inferInsert

/**
 * IS-MTG stub — calendar blocks used to detect when a user is in a meeting.
 *
 * The presence heartbeat queries this table to override status → 'meeting'
 * when a block's [starts_at, ends_at] window covers now(). Populated by the
 * IS-MTG integration (Phase 2); empty until then.
 */
export const userCalendarBlocks = platform.table(
  'user_calendar_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull().default('Meeting'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantUserIdx: index('ucb_tenant_user_idx').on(t.tenantId, t.userId),
    tenantTimeIdx: index('ucb_tenant_time_idx').on(t.tenantId, t.startsAt, t.endsAt),
  }),
)

export type UserCalendarBlock = typeof userCalendarBlocks.$inferSelect
export type NewUserCalendarBlock = typeof userCalendarBlocks.$inferInsert
