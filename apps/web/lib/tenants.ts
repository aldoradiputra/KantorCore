import 'server-only'
import { eq, and } from 'drizzle-orm'
import { tenants, memberships, type Tenant, type Membership } from '@kantr/db'
import { getDb } from './db'

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,62}[a-z0-9])?$/
const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'auth', 'mail', 'email',
  'kantr', 'docs', 'roadmap', 'marketing', 'help', 'support',
  'status', 'blog', 'about', 'pricing', 'login', 'signup',
])

/** Returns a clean error message when the slug is rejected, or null when valid. */
export function validateSlug(slug: string): string | null {
  if (!slug) return 'Slug wajib diisi.'
  if (slug.length < 3) return 'Slug minimal 3 karakter.'
  if (slug.length > 64) return 'Slug maksimal 64 karakter.'
  if (!SLUG_RE.test(slug)) {
    return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (tidak diawali/diakhiri tanda hubung).'
  }
  if (RESERVED_SLUGS.has(slug)) return 'Slug ini dipakai untuk sistem. Pilih yang lain.'
  return null
}

/**
 * Creates a tenant and grants the given user the `owner` role. Used both
 * during the initial sign-up flow and by the `/api/provision` endpoint for
 * users who want to create additional workspaces.
 */
export async function provisionTenant(input: {
  userId: string
  name: string
  slug: string
}): Promise<{ ok: true; tenant: Tenant; membership: Membership } | { ok: false; error: string }> {
  const slug = input.slug.trim().toLowerCase()
  const name = input.name.trim()

  const slugError = validateSlug(slug)
  if (slugError) return { ok: false, error: slugError }
  if (name.length < 2) return { ok: false, error: 'Nama workspace terlalu pendek.' }

  const db = getDb()
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)
  if (existing.length > 0) return { ok: false, error: 'Slug sudah dipakai.' }

  // Tenant + owner membership in one transaction so a partial signup never
  // leaves an ownerless workspace.
  const result = await db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({ slug, name, status: 'active' })
      .returning()

    const [membership] = await tx
      .insert(memberships)
      .values({ userId: input.userId, tenantId: tenant.id, role: 'owner' })
      .returning()

    return { tenant, membership }
  })

  return { ok: true, ...result }
}

/**
 * Returns the user's current tenant context. Multi-tenant switching ships in
 * Phase 11; for now the user is placed in the most recently joined workspace.
 */
export async function getCurrentTenant(userId: string): Promise<
  { tenant: Tenant; membership: Membership } | null
> {
  const db = getDb()
  const rows = await db
    .select({ tenant: tenants, membership: memberships })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId))
    .orderBy(memberships.createdAt)
    .limit(1)
  return rows[0] ?? null
}
