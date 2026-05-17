import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * The `chat` schema holds IS-CHAT module tables. Per ADR-001, every table
 * here carries `tenant_id` and is tenant-isolated. RLS policies are added
 * in a follow-up migration once the access pattern is settled; for now we
 * filter by tenant_id explicitly in every query.
 */
export const chat = pgSchema('chat')

export const channelKind = pgEnum('chat_channel_kind', ['public', 'private', 'dm'])

export const channels = chat.table(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /**
     * Channel slug — unique per tenant. Used in URLs (`/chat/general`).
     * For DMs this is a deterministic hash of the two user IDs.
     */
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    kind: channelKind('kind').notNull().default('public'),
    description: text('description'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantSlugUnique: uniqueIndex('chat_channels_tenant_slug_unique').on(t.tenantId, t.slug),
    tenantIdx: index('chat_channels_tenant_id_idx').on(t.tenantId),
  }),
)

export const messages = chat.table(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => ({
    // The hot read path: messages for one channel, newest first.
    channelCreatedIdx: index('chat_messages_channel_created_idx').on(
      t.channelId,
      t.createdAt,
    ),
    tenantIdx: index('chat_messages_tenant_id_idx').on(t.tenantId),
  }),
)

export type Channel = typeof channels.$inferSelect
export type NewChannel = typeof channels.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
