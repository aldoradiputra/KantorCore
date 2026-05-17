import 'server-only'
import { createDb, type Database } from '@kantr/db'

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
