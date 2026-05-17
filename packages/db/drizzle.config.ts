import type { Config } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env at the workspace root.')
}

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  schemaFilter: ['platform', 'chat', 'proj'],
  verbose: true,
  strict: true,
} satisfies Config
