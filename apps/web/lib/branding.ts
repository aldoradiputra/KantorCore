import { eq } from 'drizzle-orm'
import { tenants } from '@kantorcore/db'
import { getDb } from './db'

export interface TenantBranding {
  logoUrl:    string | null
  brandColor: string | null
  loginBgUrl: string | null
}

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  const db = getDb()
  const [row] = await db
    .select({
      logoUrl:    tenants.logoUrl,
      brandColor: tenants.brandColor,
      loginBgUrl: tenants.loginBgUrl,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  return {
    logoUrl:    row?.logoUrl    ?? null,
    brandColor: row?.brandColor ?? null,
    loginBgUrl: row?.loginBgUrl ?? null,
  }
}

export async function updateTenantBranding(
  tenantId: string,
  patch: Partial<TenantBranding>,
): Promise<{ ok: true; branding: TenantBranding } | { ok: false; error: string }> {
  if (patch.brandColor !== undefined && patch.brandColor !== null && !HEX_REGEX.test(patch.brandColor)) {
    return { ok: false, error: 'brandColor harus format heks 6-digit (mis. #3B4FC4).' }
  }
  if (patch.logoUrl !== undefined && patch.logoUrl !== null) {
    if (!isValidUrl(patch.logoUrl)) return { ok: false, error: 'logoUrl harus URL http(s) yang valid.' }
  }
  if (patch.loginBgUrl !== undefined && patch.loginBgUrl !== null) {
    if (!isValidUrl(patch.loginBgUrl)) return { ok: false, error: 'loginBgUrl harus URL http(s) yang valid.' }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.logoUrl    !== undefined) updates.logoUrl    = patch.logoUrl    || null
  if (patch.brandColor !== undefined) updates.brandColor = patch.brandColor || null
  if (patch.loginBgUrl !== undefined) updates.loginBgUrl = patch.loginBgUrl || null

  const db = getDb()
  await db.update(tenants).set(updates).where(eq(tenants.id, tenantId))

  return { ok: true, branding: await getTenantBranding(tenantId) }
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
