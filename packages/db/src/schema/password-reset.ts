import { uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { platform } from './tenants'
import { users } from './users'

export const passwordResetTokens = platform.table(
  'password_reset_tokens',
  {
    token: text('token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('prt_user_idx').on(t.userId),
  }),
)

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert
