import { eq } from 'drizzle-orm'
import { users, type ThemeMode, type AccentColor, ACCENT_COLORS } from '@kantorcore/db'
import { getDb } from './db'

export type { ThemeMode, AccentColor }
export { ACCENT_COLORS }

export interface UserAppearance {
  themeMode: ThemeMode
  accentColor: AccentColor
}

export async function getUserAppearance(userId: string): Promise<UserAppearance> {
  const db = getDb()
  const [row] = await db
    .select({ themeMode: users.themeMode, accentColor: users.accentColor })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return {
    themeMode:   (row?.themeMode as ThemeMode) ?? 'light',
    accentColor: (row?.accentColor as AccentColor) ?? 'indigo',
  }
}

export async function updateUserAppearance(
  userId: string,
  patch: Partial<UserAppearance>,
): Promise<{ ok: true; appearance: UserAppearance } | { ok: false; error: string }> {
  if (patch.themeMode && patch.themeMode !== 'light' && patch.themeMode !== 'dark') {
    return { ok: false, error: 'themeMode harus "light" atau "dark".' }
  }
  if (patch.accentColor && !ACCENT_COLORS.includes(patch.accentColor)) {
    return { ok: false, error: `accentColor harus salah satu: ${ACCENT_COLORS.join(', ')}` }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.themeMode)   updates.themeMode   = patch.themeMode
  if (patch.accentColor) updates.accentColor = patch.accentColor

  const db = getDb()
  await db.update(users).set(updates).where(eq(users.id, userId))

  return { ok: true, appearance: await getUserAppearance(userId) }
}
