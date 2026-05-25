import 'server-only'
import { and, eq, lte, gte, sql } from 'drizzle-orm'
import { userPresence, userCalendarBlocks, users, memberships } from '@kantorcore/db'
import { withTenant } from './db'

export type PresenceStatus = 'online' | 'afk' | 'meeting' | 'offline'

export interface PresenceRow {
  userId: string
  name: string
  email: string
  status: PresenceStatus
  lastSeenAt: Date
}

/**
 * Returns all workspace members with their presence status, ordered by
 * status (online → meeting → afk → offline), then by name.
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
          WHEN ${userPresence.status} = 'meeting' THEN 2
          WHEN ${userPresence.status} = 'afk'     THEN 3
          ELSE 4
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
 * Checks whether the user currently has an active calendar block.
 * Returns true if any block's [starts_at, ends_at] window covers now().
 */
async function checkUserInMeeting(tenantId: string, userId: string, tx: any): Promise<boolean> {
  const now = sql`now()`
  const result = await tx
    .select({ id: userCalendarBlocks.id })
    .from(userCalendarBlocks)
    .where(
      and(
        eq(userCalendarBlocks.tenantId, tenantId),
        eq(userCalendarBlocks.userId, userId),
        lte(userCalendarBlocks.startsAt, now),
        gte(userCalendarBlocks.endsAt, now),
      ),
    )
    .limit(1)
  return result.length > 0
}

/**
 * Upserts a presence row for (tenantId, userId). On conflict updates status,
 * lastSeenAt, and updatedAt.
 *
 * After upserting the client-reported status, checks the calendar blocks table.
 * If the user has an active block and their status is not 'offline', the status
 * is overridden to 'meeting'.
 */
export async function upsertPresence(
  tenantId: string,
  userId: string,
  status: PresenceStatus,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    // 1. Upsert the client-reported status
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

    // 2. Override to 'meeting' if the user has an active calendar block
    //    (never override if the client explicitly went offline)
    if (status !== 'offline') {
      const inMeeting = await checkUserInMeeting(tenantId, userId, tx)
      if (inMeeting) {
        await tx
          .update(userPresence)
          .set({ status: 'meeting', updatedAt: new Date() })
          .where(
            and(
              eq(userPresence.tenantId, tenantId),
              eq(userPresence.userId, userId),
            ),
          )
      }
    }
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
