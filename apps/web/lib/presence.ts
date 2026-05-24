import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { userPresence, type UserPresence, users, memberships } from '@kantorcore/db'
import { withTenant } from './db'

export type PresenceStatus = 'online' | 'away' | 'offline'

export interface PresenceRow {
  userId: string
  name: string
  email: string
  status: PresenceStatus
  lastSeenAt: Date
}

/**
 * Returns all workspace members with their presence status, ordered by
 * status ('online' first, 'away' second, 'offline' last), then by name.
 */
export async function listPresence(tenantId: string): Promise<PresenceRow[]> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        userId: userPresence.userId,
        name: users.name,
        email: users.email,
        status: userPresence.status,
        lastSeenAt: userPresence.lastSeenAt,
      })
      .from(userPresence)
      .innerJoin(users, eq(userPresence.userId, users.id))
      .innerJoin(
        memberships,
        and(
          eq(memberships.userId, userPresence.userId),
          eq(memberships.tenantId, userPresence.tenantId),
        ),
      )
      .where(eq(userPresence.tenantId, tenantId))
      .orderBy(
        sql`CASE
          WHEN ${userPresence.status} = 'online'  THEN 1
          WHEN ${userPresence.status} = 'away'    THEN 2
          ELSE 3
        END`,
        users.name,
      )

    return rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      status: r.status as PresenceStatus,
      lastSeenAt: r.lastSeenAt,
    }))
  })
}

/**
 * Upserts a presence row for (tenantId, userId). On conflict updates status,
 * lastSeenAt, and updatedAt.
 */
export async function upsertPresence(
  tenantId: string,
  userId: string,
  status: PresenceStatus,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx
      .insert(userPresence)
      .values({
        tenantId,
        userId,
        status,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userPresence.tenantId, userPresence.userId],
        set: {
          status,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      })
  })
}

/**
 * Marks users offline when their lastSeenAt falls outside the heartbeat
 * window. Defaults to 45 seconds; matches two missed 30-second keepalives.
 */
export async function markStaleUsersOffline(
  tenantId: string,
  thresholdSeconds = 45,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx
      .update(userPresence)
      .set({ status: 'offline', updatedAt: new Date() })
      .where(
        and(
          eq(userPresence.tenantId, tenantId),
          sql`${userPresence.status} != 'offline'`,
          sql`${userPresence.lastSeenAt} < now() - (${thresholdSeconds} || ' seconds')::interval`,
        ),
      )
  })
}
