# @kantr/db

Postgres schema, Drizzle ORM client, and migrations for Kantr.

## Local development

Start Postgres locally:

```bash
docker compose up -d
```

This brings up a Postgres 16 container on `localhost:5432` with the
`kantr_dev` database. Copy `.env.example` to `.env` at the workspace root.

Generate and apply migrations:

```bash
pnpm --filter=@kantr/db db:generate   # create a new migration from schema diffs
pnpm --filter=@kantr/db db:migrate    # apply pending migrations
pnpm --filter=@kantr/db db:studio     # open Drizzle Studio GUI
```

## Schema

```
platform.tenants    — every customer workspace
                      slug, name, status, plan, db_mode, db_url, timestamps
```

Per ADR-001 (multi-tenancy), every tenant-scoped table in every module
must:
1. Include a `tenant_id` column referencing `platform.tenants(id)`
2. Have RLS enabled with policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`
3. Be tested against both shared and dedicated database modes

The `platform` schema itself is workspace-wide — no tenant filtering applies.

## Migrations

Migrations are forward-only. Files in `migrations/` are append-only and
committed to git. Never edit a migration after it has been applied to any
shared environment — write a new one instead.

## Usage in apps

```ts
import { createDb, tenants, type Tenant } from '@kantr/db'

const db = createDb(process.env.DATABASE_URL!)
const result: Tenant[] = await db.select().from(tenants)
```
