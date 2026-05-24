import 'server-only'
import { and, eq } from 'drizzle-orm'
import { models as modelsTable, type Model } from '@kantorcore/db'
import { withTenant } from '../db'
import { invalidateRegistry } from './registry'

const KEY_RE = /^[a-z][a-z0-9_]*$/

/**
 * Create a tenant-defined entity. Backed by the shared platform.records table,
 * discriminated by model_id. Only `name` and `number` are exposed as built-in
 * columns; everything else is added later as custom fields (EAV).
 */
export async function createTenantModel(input: {
  tenantId: string
  key: string
  label: string
  labelPlural?: string
  numberingPrefix?: string | null
  numberingFormat?: string | null
}): Promise<{ ok: true; model: Model } | { ok: false; error: string }> {
  if (!KEY_RE.test(input.key)) {
    return { ok: false, error: 'Key harus lowercase + underscore, mulai huruf.' }
  }
  if (!input.label.trim()) {
    return { ok: false, error: 'Label wajib diisi.' }
  }

  try {
    const rows = await withTenant(input.tenantId, (tx) =>
      tx
        .insert(modelsTable)
        .values({
          tenantId: input.tenantId,
          key: input.key,
          label: input.label.trim(),
          labelPlural: (input.labelPlural ?? input.label).trim(),
          schemaName: 'platform',
          tableName: 'records',
          hasLines: false,
          hasChatter: false,
          hasAudit: true,
          numberingPrefix: input.numberingPrefix ?? null,
          numberingFormat: input.numberingFormat ?? null,
          isSystem: false,
        })
        .returning(),
    )
    invalidateRegistry()
    return { ok: true, model: rows[0]! }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('unique')) {
      return { ok: false, error: `Key '${input.key}' sudah dipakai.` }
    }
    return { ok: false, error: msg }
  }
}

export async function deleteTenantModel(
  tenantId: string,
  modelId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .delete(modelsTable)
      .where(
        and(
          eq(modelsTable.tenantId, tenantId),
          eq(modelsTable.id, modelId),
          eq(modelsTable.isSystem, false),
        ),
      )
      .returning({ id: modelsTable.id }),
  )
  if (rows.length === 0) {
    return { ok: false, error: 'Model tidak ditemukan atau bukan model tenant.' }
  }
  invalidateRegistry()
  return { ok: true }
}
