/**
 * @kantorcore/db — Postgres + Drizzle ORM schema, client, and types for KantorCore.
 *
 * Apps create a client by calling createDb(process.env.DATABASE_URL!) and
 * import tables from this package.
 */

export { createDb } from './client'
export type { Database } from './client'

// Re-export the schema barrel so consumers can:
//   import { tenants, type Tenant } from '@kantorcore/db'
export * from './schema'
