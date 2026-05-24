import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = ReturnType<typeof createDb>

/**
 * Create a Drizzle database client. Callers pass their own DATABASE_URL so
 * the package itself stays config-free and edge-compatible.
 *
 * For the multi-tenant routing layer (ADR-001), the API layer resolves the
 * tenant's db_url from `platform.tenants` (cached 5 min) and creates a
 * tenant-scoped client per request. Shared-mode tenants share one client
 * that applies RLS via SET LOCAL app.tenant_id.
 */
export function createDb(databaseUrl: string) {
  const sql = postgres(databaseUrl, {
    max: 1,             // serverless: 1 connection per lambda invocation
    idle_timeout: 20,
    prepare: false,     // off — required for pgbouncer/Supabase pooler
    ssl: 'require',     // Supabase pooler requires SSL
  })
  return drizzle(sql, { schema })
}
