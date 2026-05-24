import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { views, type View, type NewView } from '@kantorcore/db'
import { withTenant } from '../db'
import { getModel } from './registry'

export type { View }

export interface ViewFilter {
  field: string
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains'
  value: unknown
}

export interface ViewSort {
  field: string
  dir: 'asc' | 'desc'
}

export async function listViews(
  tenantId: string,
  modelKey: string,
): Promise<View[]> {
  const def = await getModel(modelKey, tenantId)
  if (!def) return []
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(views)
      .where(and(eq(views.tenantId, tenantId), eq(views.modelId, def.model.id)))
      .orderBy(desc(views.isDefault), asc(views.name)),
  )
}

export async function getView(tenantId: string, id: string): Promise<View | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(views)
      .where(and(eq(views.tenantId, tenantId), eq(views.id, id)))
      .limit(1),
  )
  return rows[0] ?? null
}

export async function getDefaultView(
  tenantId: string,
  modelKey: string,
): Promise<View | null> {
  const def = await getModel(modelKey, tenantId)
  if (!def) return null
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(views)
      .where(
        and(
          eq(views.tenantId, tenantId),
          eq(views.modelId, def.model.id),
          eq(views.isDefault, true),
        ),
      )
      .limit(1),
  )
  return rows[0] ?? null
}

export async function createView(input: {
  tenantId: string
  modelKey: string
  name: string
  kind?: string
  columns?: string[]
  filters?: ViewFilter[]
  sorts?: ViewSort[]
  isDefault?: boolean
  isShared?: boolean
  createdBy?: string
}): Promise<{ ok: true; view: View } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: 'Nama wajib diisi.' }
  const def = await getModel(input.modelKey, input.tenantId)
  if (!def) return { ok: false, error: 'Model tidak dikenal.' }

  return withTenant(input.tenantId, async (tx) => {
    // If isDefault, clear other defaults for this (tenant, model) first
    if (input.isDefault) {
      await tx
        .update(views)
        .set({ isDefault: false })
        .where(
          and(
            eq(views.tenantId, input.tenantId),
            eq(views.modelId, def.model.id),
            eq(views.isDefault, true),
          ),
        )
    }

    const newRow: NewView = {
      tenantId: input.tenantId,
      modelId: def.model.id,
      name: input.name.trim(),
      kind: input.kind ?? 'list',
      columns: input.columns ?? [],
      filters: (input.filters ?? []) as never,
      sorts: (input.sorts ?? []) as never,
      isDefault: input.isDefault ?? false,
      isShared: input.isShared ?? true,
      createdBy: (input.createdBy as `${string}-${string}-${string}-${string}-${string}` | undefined) ?? null,
    }

    const rows = await tx.insert(views).values(newRow).returning()
    return { ok: true as const, view: rows[0]! }
  })
}

export async function updateView(input: {
  tenantId: string
  id: string
  name?: string
  columns?: string[]
  filters?: ViewFilter[]
  sorts?: ViewSort[]
  isDefault?: boolean
}): Promise<{ ok: true; view: View } | { ok: false; error: string }> {
  const existing = await getView(input.tenantId, input.id)
  if (!existing) return { ok: false, error: 'View tidak ditemukan.' }

  return withTenant(input.tenantId, async (tx) => {
    if (input.isDefault) {
      await tx
        .update(views)
        .set({ isDefault: false })
        .where(
          and(
            eq(views.tenantId, input.tenantId),
            eq(views.modelId, existing.modelId),
            eq(views.isDefault, true),
          ),
        )
    }
    const patch: Partial<NewView> = { updatedAt: new Date() }
    if (input.name !== undefined) patch.name = input.name.trim()
    if (input.columns !== undefined) patch.columns = input.columns
    if (input.filters !== undefined) patch.filters = input.filters as never
    if (input.sorts !== undefined) patch.sorts = input.sorts as never
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault

    const rows = await tx
      .update(views)
      .set(patch)
      .where(eq(views.id, input.id))
      .returning()
    return { ok: true as const, view: rows[0]! }
  })
}

export async function deleteView(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .delete(views)
      .where(and(eq(views.tenantId, tenantId), eq(views.id, id)))
      .returning({ id: views.id }),
  )
  if (rows.length === 0) return { ok: false, error: 'View tidak ditemukan.' }
  return { ok: true }
}

// ── Apply view (used by list pages) ─────────────────────────────────────────

/**
 * Build a WHERE/ORDER clause from view filters and sorts for the shared
 * platform.records table (or any table with model_id). Returns parameterized
 * Drizzle SQL fragments. Filters only apply to system column fields (name,
 * number, status). EAV filtering against custom fields is out of scope here.
 */
const SYSTEM_COLS = new Set(['name', 'number', 'status', 'created_at', 'updated_at'])

export function buildViewSql(view: View | null): {
  whereSql: ReturnType<typeof sql> | null
  orderSql: ReturnType<typeof sql> | null
} {
  if (!view) return { whereSql: null, orderSql: null }

  const whereFragments: ReturnType<typeof sql>[] = []
  for (const f of (view.filters ?? []) as ViewFilter[]) {
    if (!SYSTEM_COLS.has(f.field)) continue
    const col = sql.identifier(f.field)
    switch (f.op) {
      case 'eq':       whereFragments.push(sql`${col} = ${f.value}`); break
      case 'ne':       whereFragments.push(sql`${col} <> ${f.value}`); break
      case 'gt':       whereFragments.push(sql`${col} > ${f.value}`); break
      case 'gte':      whereFragments.push(sql`${col} >= ${f.value}`); break
      case 'lt':       whereFragments.push(sql`${col} < ${f.value}`); break
      case 'lte':      whereFragments.push(sql`${col} <= ${f.value}`); break
      case 'contains': whereFragments.push(sql`${col} ILIKE ${'%' + String(f.value) + '%'}`); break
      case 'in':
        if (Array.isArray(f.value) && f.value.length > 0) {
          whereFragments.push(sql`${col} = ANY(${f.value as unknown[]})`)
        }
        break
      case 'not_in':
        if (Array.isArray(f.value) && f.value.length > 0) {
          whereFragments.push(sql`${col} <> ALL(${f.value as unknown[]})`)
        }
        break
    }
  }

  const orderFragments: ReturnType<typeof sql>[] = []
  for (const s of (view.sorts ?? []) as ViewSort[]) {
    if (!SYSTEM_COLS.has(s.field)) continue
    const dir = s.dir === 'desc' ? sql`DESC` : sql`ASC`
    orderFragments.push(sql`${sql.identifier(s.field)} ${dir}`)
  }

  return {
    whereSql: whereFragments.length > 0 ? sql.join(whereFragments, sql` AND `) : null,
    orderSql: orderFragments.length > 0 ? sql.join(orderFragments, sql`, `) : null,
  }
}
