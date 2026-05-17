import { uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { platform } from './tenants'

/**
 * Platform-wide identity. A single user account is the login subject;
 * tenant membership (the user's role within each workspace) is modelled
 * separately in `platform.memberships` (Phase 10).
 *
 * Email is the only login handle for now. Password is Argon2id-hashed via
 * `@kantr/auth`; never store plaintext, never log this column.
 */
export const users = platform.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
