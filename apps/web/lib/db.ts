import { sql, eq } from 'drizzle-orm'
import { createDb, type Database, tenants } from '@kantorcore/db'

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

// ---------------------------------------------------------------------------
// Phase 20: per-tenant DB routing
// Shared tenants use the default pool. Dedicated tenants get their own
// connection (pointed at db_url) — the Hyperdrive slot for CF migration.
// ---------------------------------------------------------------------------

interface TenantMeta {
  dbMode: 'shared' | 'dedicated'
  dbUrl: string | null
  cachedAt: number
}

interface DedicatedEntry {
  db: Database
  lastUsed: number
}

const META_TTL_MS = 60_000
const CLIENT_TTL_MS = 5 * 60_000
const metaCache = new Map<string, TenantMeta>()
const clientCache = new Map<string, DedicatedEntry>()

async function getTenantMeta(tenantId: string): Promise<Pick<TenantMeta, 'dbMode' | 'dbUrl'>> {
  const hit = metaCache.get(tenantId)
  if (hit && Date.now() - hit.cachedAt < META_TTL_MS) {
    return { dbMode: hit.dbMode, dbUrl: hit.dbUrl }
  }
  const [row] = await getDb()
    .select({ dbMode: tenants.dbMode, dbUrl: tenants.dbUrl })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
  const meta: TenantMeta = {
    dbMode: row?.dbMode ?? 'shared',
    dbUrl: row?.dbUrl ?? null,
    cachedAt: Date.now(),
  }
  metaCache.set(tenantId, meta)
  return { dbMode: meta.dbMode, dbUrl: meta.dbUrl }
}

function getDedicatedDb(tenantId: string, dbUrl: string): Database {
  const hit = clientCache.get(tenantId)
  if (hit) {
    hit.lastUsed = Date.now()
    return hit.db
  }
  // Evict idle connections
  const now = Date.now()
  for (const [id, entry] of clientCache) {
    if (now - entry.lastUsed > CLIENT_TTL_MS) clientCache.delete(id)
  }
  const db = createDb(dbUrl)
  clientCache.set(tenantId, { db, lastUsed: now })
  return db
}

/**
 * Runs `fn` inside a Postgres transaction with the right RLS GUCs set, so
 * that every policy on tenant-scoped tables evaluates correctly.
 *
 * For `db_mode = 'dedicated'` tenants the transaction runs against their
 * private database (the Hyperdrive slot for CF migration). Shared tenants
 * use the default pool — behaviour identical to before Phase 20.
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
  const { dbMode, dbUrl } = await getTenantMeta(tenantId)
  const db = dbMode === 'dedicated' && dbUrl ? getDedicatedDb(tenantId, dbUrl) : getDb()
  return db.transaction(async (tx) => {
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
