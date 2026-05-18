import { uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'
import { membershipRole } from './memberships'

/**
 * Pending workspace invitations. An invite is created by an admin/owner and
 * consumed once (accepted_at is set). Expired invites (expires_at < now())
 * are rejected at the accept endpoint.
 *
 * No email is sent server-side yet — the invite link is surfaced in the UI
 * so the inviter can share it manually. Email delivery ships with IS-EMAIL.
 */
export const invites = platform.table(
  'invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: membershipRole('role').notNull().default('member'),
    /** Opaque random token — 32-byte base64url. Used in the accept URL. */
    token: text('token').notNull().unique(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantEmailIdx: index('invites_tenant_email_idx').on(t.tenantId, t.email),
    tokenIdx: uniqueIndex('invites_token_unique').on(t.token),
    tenantIdx: index('invites_tenant_id_idx').on(t.tenantId),
  }),
)

export type Invite = typeof invites.$inferSelect
export type NewInvite = typeof invites.$inferInsert
