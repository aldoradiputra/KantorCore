import 'server-only'
import { and, eq, isNull, or } from 'drizzle-orm'
import { modelLayouts } from '@kantorcore/db'
import { getDb } from '../db'
import { getModel } from './registry'

export type ViewKind = 'detail' | 'list'

export type DetailBlock =
  | { type: 'header'; title_field: string; subtitle_field?: string }
  | { type: 'fields'; fields: string[] }
  | { type: 'custom_fields' }
  | { type: 'actions' }

export interface ListLayout {
  columns: string[]
}

export type DetailLayout = DetailBlock[]

/**
 * Returns the active layout for a model + view. Tenant override wins over
 * system default. Falls back to a sensible default if no row is seeded.
 */
export async function getLayout<T = unknown>(
  modelKey: string,
  viewKind: ViewKind,
  tenantId: string,
): Promise<T> {
  const def = await getModel(modelKey, tenantId)
  if (!def) throw new Error(`Unknown model: ${modelKey}`)

  const rows = await getDb()
    .select()
    .from(modelLayouts)
    .where(
      and(
        eq(modelLayouts.modelId, def.model.id),
        eq(modelLayouts.viewKind, viewKind),
        or(eq(modelLayouts.tenantId, tenantId), isNull(modelLayouts.tenantId)),
      ),
    )

  // Prefer tenant-specific row over system default
  const chosen = rows.find((r) => r.tenantId === tenantId) ?? rows.find((r) => r.tenantId === null)
  if (chosen) return chosen.blocks as T

  // Default fallback: list = first 4 system fields; detail = header + all fields + custom_fields
  if (viewKind === 'list') {
    return { columns: def.systemFields.slice(0, 4).map((f) => f.key) } as T
  }
  const titleField = def.systemFields.find((f) => f.key === 'name')?.key ?? def.systemFields[0]?.key ?? 'id'
  return [
    { type: 'header', title_field: titleField },
    { type: 'fields', fields: def.systemFields.map((f) => f.key) },
    { type: 'custom_fields' },
  ] as T
}
