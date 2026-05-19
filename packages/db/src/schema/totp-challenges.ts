import { uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { platform } from './tenants'
import { users } from './users'

export const totpChallenges = platform.table(
  'totp_challenges',
  {
    token: text('token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').notNull().default(false),
  },
  (t) => ({
    userIdx: index('tc_user_idx').on(t.userId),
  }),
)

export type TotpChallenge = typeof totpChallenges.$inferSelect
export type NewTotpChallenge = typeof totpChallenges.$inferInsert
