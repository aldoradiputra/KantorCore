import { randomBytes } from 'crypto'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { users, passwordResetTokens } from '@kantorcore/db'
import { hashPassword } from '@kantorcore/auth'
import { invalidateAllUserSessions } from '@kantorcore/auth/server'
import { getDb } from './db'

const TOKEN_TTL_MINUTES = 60

export async function createPasswordResetToken(
  email: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const db = getDb()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)

  if (!user) {
    // Don't reveal whether the email exists — return ok with a dummy token
    // that will fail validation. This prevents user enumeration.
    return { ok: true, token: randomBytes(32).toString('hex') }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  await db.insert(passwordResetTokens).values({ token, userId: user.id, expiresAt })
  return { ok: true, token }
}

export async function validatePasswordResetToken(
  token: string,
): Promise<{ valid: true; userId: string } | { valid: false }> {
  const db = getDb()
  const [row] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!row) return { valid: false }
  return { valid: true, userId: row.userId }
}

export async function consumePasswordResetToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 10) {
    return { ok: false, error: 'Kata sandi minimal 10 karakter.' }
  }

  const check = await validatePasswordResetToken(token)
  if (!check.valid) return { ok: false, error: 'Tautan reset tidak valid atau sudah kedaluwarsa.' }

  const db = getDb()
  const passwordHash = await hashPassword(newPassword)

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token))
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, check.userId))
  })

  // Invalidate all sessions so other devices are logged out.
  await invalidateAllUserSessions(db, check.userId)

  return { ok: true }
}
