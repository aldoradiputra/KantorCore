import 'server-only'
import { sql } from 'drizzle-orm'
import { createDb, type Database } from '@kantorcore/db'

let cached: Database | undefined

/**
 * Lazy singleton db client. Created on first call so that build-time imports
 * (linting, route discovery) don't require DATABASE_URL.
 */
export function getDb(): Database {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env at the workspace root.',
    )
  }
  cached = createDb(url)
  return cached
}

type TxClient = Parameters<Parameters<Database['transaction']>[0]>[0]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Runs `fn` inside a Postgres transaction with the right RLS GUCs set, so
 * that every policy on tenant-scoped tables evaluates correctly.
 *
 * Pass `tenantId` for normal tenant-scoped work. Pass `userId` as well when
 * the work also needs to read the caller's memberships (rare — most flows
 * already know their tenant). The session-level GUC is set via SET LOCAL —
 * scoped to the transaction so it can't leak across requests when connection
 * pooling reuses a backend.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TxClient) => Promise<T>,
  opts?: { userId?: string },
): Promise<T> {
  if (!UUID_RE.test(tenantId)) throw new Error('withTenant: invalid tenantId')
  if (opts?.userId && !UUID_RE.test(opts.userId)) {
    throw new Error('withTenant: invalid userId')
  }
  return getDb().transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`))
    if (opts?.userId) {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${opts.userId}'`))
    }
    return fn(tx)
  })
}

/**
 * For flows that need to read a user's memberships before a tenant is known —
 * specifically `getCurrentTenant()` during the auth handshake. The policy on
 * `platform.memberships` accepts `user_id = app.user_id` so this works.
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(userId)) throw new Error('withUser: invalid userId')
  return getDb().transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`))
    return fn(tx)
  })
}

/**
 * Used by the invite-acceptance flow: an unauthenticated visitor needs to
 * read their invite row before signing up. The policy on `platform.invites`
 * accepts `token = app.invite_token`.
 */
export async function withInviteToken<T>(
  token: string,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  // Reject anything that could break out of the GUC literal. Tokens are
  // base64url so they only contain [A-Za-z0-9_-].
  if (!/^[A-Za-z0-9_-]+$/.test(token) || token.length > 256) {
    throw new Error('withInviteToken: invalid token')
  }
  return getDb().transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.invite_token = '${token}'`))
    return fn(tx)
  })
}
