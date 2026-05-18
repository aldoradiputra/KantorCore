/**
 * Phase 16 smoke test: prove RLS actually blocks cross-tenant reads.
 *
 * Usage: cd apps/web && pnpm exec tsx scripts/test-rls.ts
 *
 * This is intentionally not in a test framework — it's a 30-line script that
 * connects directly to the database, plants two tenants, then asserts that
 * setting `app.tenant_id = A` makes tenant B's rows invisible. If RLS were
 * misconfigured we'd see B's row from A's context and the script exits 1.
 */
import 'dotenv/config'
import { createDb } from '@kantorcore/db'
import { sql } from 'drizzle-orm'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const db = createDb(url)

async function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('PASS:', msg)
}

async function main() {
  // Spin up two throwaway tenants + one channel each.
  const a = await db.execute(sql`
    INSERT INTO platform.tenants (slug, name, status)
    VALUES (${'rls-test-a-' + Date.now()}, 'RLS Test A', 'active')
    RETURNING id
  `)
  const b = await db.execute(sql`
    INSERT INTO platform.tenants (slug, name, status)
    VALUES (${'rls-test-b-' + Date.now()}, 'RLS Test B', 'active')
    RETURNING id
  `)
  const tenantA = (a as unknown as { id: string }[])[0].id
  const tenantB = (b as unknown as { id: string }[])[0].id

  // Need a user (channel.created_by is NOT NULL). Reuse any existing user.
  const users = await db.execute(sql`SELECT id FROM platform.users LIMIT 1`)
  const userId = (users as unknown as { id: string }[])[0]?.id
  if (!userId) {
    console.error('No users exist — seed at least one user before running.')
    process.exit(1)
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantA}'`))
    await tx.execute(sql`
      INSERT INTO chat.channels (tenant_id, slug, name, created_by, kind)
      VALUES (${tenantA}::uuid, ${'a-chan'}, 'A channel', ${userId}::uuid, 'public')
    `)
  })
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantB}'`))
    await tx.execute(sql`
      INSERT INTO chat.channels (tenant_id, slug, name, created_by, kind)
      VALUES (${tenantB}::uuid, ${'b-chan'}, 'B channel', ${userId}::uuid, 'public')
    `)
  })

  // ── Assertion 1: A's context sees only A's channel ──────────────────────
  const fromA = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantA}'`))
    return tx.execute(sql`SELECT tenant_id::text AS tid FROM chat.channels`)
  })
  const rowsA = fromA as unknown as { tid: string }[]
  await assert(
    rowsA.every((r) => r.tid === tenantA),
    `A's context returns only A's rows (got ${rowsA.length})`,
  )

  // ── Assertion 2: no context sees nothing ────────────────────────────────
  const noCtx = (await db.execute(
    sql`SELECT tenant_id::text AS tid FROM chat.channels`,
  )) as unknown as { tid: string }[]
  await assert(noCtx.length === 0, `no context returns 0 rows (got ${noCtx.length})`)

  // ── Assertion 3: A cannot INSERT for B ──────────────────────────────────
  let blocked = false
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantA}'`))
      await tx.execute(sql`
        INSERT INTO chat.channels (tenant_id, slug, name, created_by, kind)
        VALUES (${tenantB}::uuid, ${'sneaky'}, 'sneaky', ${userId}::uuid, 'public')
      `)
    })
  } catch {
    blocked = true
  }
  await assert(blocked, 'INSERT for tenant B from A context is blocked by WITH CHECK')

  // Cleanup
  await db.execute(sql`DELETE FROM platform.tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`)
  console.log('\nAll RLS assertions passed.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
