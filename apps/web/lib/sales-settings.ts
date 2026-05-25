import 'server-only'
import { eq } from 'drizzle-orm'
import { salesSettings, type SalesSettings } from '@kantorcore/db'
import { withTenant } from './db'

export type { SalesSettings }

/** Read settings, lazily creating the row with defaults on first read. */
export async function getSalesSettings(tenantId: string): Promise<SalesSettings> {
  return withTenant(tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(salesSettings)
      .where(eq(salesSettings.tenantId, tenantId))
      .limit(1)

    if (existing) return existing

    const [created] = await tx
      .insert(salesSettings)
      .values({ tenantId })
      .returning()
    return created!
  })
}

export async function updateSalesSettings(
  tenantId: string,
  patch: Partial<Omit<SalesSettings, 'tenantId' | 'createdAt' | 'updatedAt'>>,
): Promise<SalesSettings> {
  return withTenant(tenantId, async (tx) => {
    // Ensure row exists
    await tx
      .insert(salesSettings)
      .values({ tenantId, ...patch })
      .onConflictDoUpdate({
        target: salesSettings.tenantId,
        set:    { ...patch, updatedAt: new Date() },
      })

    const [row] = await tx
      .select()
      .from(salesSettings)
      .where(eq(salesSettings.tenantId, tenantId))
      .limit(1)
    return row!
  })
}

/**
 * Format SO number from configurable template.
 * Supported tokens: {prefix}, {year}, {month}, {seq:0000}
 */
export function formatSoNumber(
  template: string,
  prefix: string,
  seq: number,
  when: Date = new Date(),
): string {
  const year  = when.getFullYear()
  const month = String(when.getMonth() + 1).padStart(2, '0')
  return template
    .replace('{prefix}', prefix)
    .replace('{year}', String(year))
    .replace('{month}', month)
    .replace(/\{seq:0+\}/, (m) => {
      const width = m.length - 6 // strip "{seq:" and "}"
      return String(seq).padStart(width, '0')
    })
}
