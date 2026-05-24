import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { fields as fieldsTable, recordValues as recordValuesTable } from '@kantorcore/db'
import { withTenant } from '../db'
import { getModel, listFields, type FieldDefinition } from './registry'
import { extractValue } from './custom-fields'
import { nextNumber } from './numbering'
import { recordAudit } from '../audit'

export interface GenericRecord {
  id: string
  [key: string]: unknown
}

/**
 * Type-correct cast of an incoming JSON value to a Postgres value for a given
 * field type. Returns null for empty/undefined.
 */
function coerceForColumn(typeKey: string, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null
  switch (typeKey) {
    case 'number':
    case 'currency':
      return Number(value)
    case 'bool':
      return Boolean(value)
    case 'date':
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
    default:
      return String(value)
  }
}

function coerceForValueColumn(typeKey: string, value: unknown) {
  const v = coerceForColumn(typeKey, value)
  if (v === null) {
    return { value_text: null, value_number: null, value_date: null, value_bool: null }
  }
  switch (typeKey) {
    case 'number':
    case 'currency':
      return { value_number: v, value_text: null, value_date: null, value_bool: null }
    case 'bool':
      return { value_bool: v, value_text: null, value_number: null, value_date: null }
    case 'date':
      return { value_date: v, value_text: null, value_number: null, value_bool: null }
    default:
      return { value_text: v, value_number: null, value_date: null, value_bool: null }
  }
}

/* ─── LIST ───────────────────────────────────────────────────────────────── */

export async function listRecords(
  tenantId: string,
  modelKey: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<GenericRecord[]> {
  const def = await getModel(modelKey)
  if (!def) throw new Error(`Unknown model: ${modelKey}`)
  const limit = Math.min(opts.limit ?? 100, 500)
  const offset = Math.max(opts.offset ?? 0, 0)
  return withTenant(tenantId, async (tx) => {
    const r = await tx.execute(sql`
      SELECT * FROM ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)
    return (r as unknown as { rows: GenericRecord[] }).rows
  })
}

/* ─── GET (record + custom field values merged in as `custom`) ───────────── */

export async function getRecord(
  tenantId: string,
  modelKey: string,
  id: string,
): Promise<(GenericRecord & { custom: Record<string, unknown> }) | null> {
  const def = await getModel(modelKey)
  if (!def) throw new Error(`Unknown model: ${modelKey}`)
  return withTenant(tenantId, async (tx) => {
    const r = await tx.execute(sql`
      SELECT * FROM ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `)
    const row = (r as unknown as { rows: GenericRecord[] }).rows[0]
    if (!row) return null

    const customRows = await tx
      .select({
        valueText: recordValuesTable.valueText,
        valueNumber: recordValuesTable.valueNumber,
        valueDate: recordValuesTable.valueDate,
        valueBool: recordValuesTable.valueBool,
        key: fieldsTable.key,
        typeKey: fieldsTable.typeKey,
      })
      .from(recordValuesTable)
      .innerJoin(fieldsTable, eq(fieldsTable.id, recordValuesTable.fieldId))
      .where(
        and(
          eq(recordValuesTable.tenantId, tenantId),
          eq(recordValuesTable.modelKey, modelKey),
          eq(recordValuesTable.recordId, id),
        ),
      )
    const custom: Record<string, unknown> = {}
    for (const cr of customRows) {
      custom[cr.key] = extractValue(cr.typeKey, cr)
    }
    return { ...row, custom }
  })
}

/* ─── CREATE ─────────────────────────────────────────────────────────────── */

export interface MutationInput {
  tenantId: string
  modelKey: string
  actorUserId: string
  /** System field values keyed by field.key. */
  values: Record<string, unknown>
  /** Custom field values keyed by field.key. */
  custom?: Record<string, unknown>
}

export async function createRecord(input: MutationInput): Promise<GenericRecord> {
  const def = await getModel(input.modelKey)
  if (!def) throw new Error(`Unknown model: ${input.modelKey}`)
  const allFields = await listFields(input.modelKey, input.tenantId)
  const systemFields = allFields.filter((f) => f.isSystem)
  const customFields = allFields.filter((f) => !f.isSystem)

  validateRequired(systemFields, input.values, customFields, input.custom)

  // Auto-generate number if the model has a numbering format and no number provided
  let generatedNumber: string | null = null
  if (def.model.numberingFormat && !input.values.number) {
    generatedNumber = await nextNumber(input.tenantId, input.modelKey)
  }

  // Initial status: first state where is_initial = true, fallback to first by display_order
  const initialState = def.statusStates.find((s) => s.isInitial)?.key ?? def.statusStates[0]?.key

  const created = await withTenant(input.tenantId, async (tx) => {
    // Build INSERT column/value lists from system fields only
    const cols: string[] = ['tenant_id']
    const vals: unknown[] = [input.tenantId]
    for (const f of systemFields) {
      if (!f.columnName) continue
      if (!(f.key in input.values)) continue
      cols.push(f.columnName)
      vals.push(coerceForColumn(f.typeKey, input.values[f.key]))
    }
    if (generatedNumber) {
      cols.push('number')
      vals.push(generatedNumber)
    }
    if (initialState && !cols.includes('status')) {
      cols.push('status')
      vals.push(initialState)
    }

    const colFragments = cols.map((c) => sql.identifier(c))
    const colsSql = sql.join(colFragments, sql`, `)
    const valsSql = sql.join(vals.map((v) => sql`${v}`), sql`, `)
    const r = await tx.execute(sql`
      INSERT INTO ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
        (${colsSql})
      VALUES (${valsSql})
      RETURNING *
    `)
    const row = (r as unknown as { rows: GenericRecord[] }).rows[0]!

    // Insert custom field values
    if (input.custom) {
      await upsertCustomValues(tx, input.tenantId, input.modelKey, row.id as string, customFields, input.custom)
    }

    return row
  })

  if (def.model.hasAudit) {
    void recordAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: `${input.modelKey}.created`,
      resourceType: input.modelKey,
      resourceId: created.id as string,
      payload: { values: input.values },
    })
  }

  return created
}

/* ─── UPDATE ─────────────────────────────────────────────────────────────── */

export async function updateRecord(input: MutationInput & { id: string }): Promise<GenericRecord> {
  const def = await getModel(input.modelKey)
  if (!def) throw new Error(`Unknown model: ${input.modelKey}`)
  const allFields = await listFields(input.modelKey, input.tenantId)
  const systemFields = allFields.filter((f) => f.isSystem)
  const customFields = allFields.filter((f) => !f.isSystem)

  const updated = await withTenant(input.tenantId, async (tx) => {
    const setFragments: ReturnType<typeof sql>[] = []
    for (const f of systemFields) {
      if (!f.columnName) continue
      if (!(f.key in input.values)) continue
      setFragments.push(sql`${sql.identifier(f.columnName)} = ${coerceForColumn(f.typeKey, input.values[f.key])}`)
    }
    setFragments.push(sql`updated_at = now()`)

    const r = await tx.execute(sql`
      UPDATE ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
      SET ${sql.join(setFragments, sql`, `)}
      WHERE id = ${input.id} AND tenant_id = ${input.tenantId}
      RETURNING *
    `)
    const row = (r as unknown as { rows: GenericRecord[] }).rows[0]
    if (!row) throw new Error('Record not found.')

    if (input.custom) {
      await upsertCustomValues(tx, input.tenantId, input.modelKey, input.id, customFields, input.custom)
    }

    return row
  })

  if (def.model.hasAudit) {
    void recordAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: `${input.modelKey}.updated`,
      resourceType: input.modelKey,
      resourceId: input.id,
      payload: { values: input.values },
    })
  }

  return updated
}

/* ─── DELETE ─────────────────────────────────────────────────────────────── */

export async function deleteRecord(input: {
  tenantId: string
  modelKey: string
  id: string
  actorUserId: string
}): Promise<void> {
  const def = await getModel(input.modelKey)
  if (!def) throw new Error(`Unknown model: ${input.modelKey}`)
  await withTenant(input.tenantId, async (tx) => {
    await tx.execute(sql`
      DELETE FROM ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
      WHERE id = ${input.id} AND tenant_id = ${input.tenantId}
    `)
  })
  if (def.model.hasAudit) {
    void recordAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: `${input.modelKey}.deleted`,
      resourceType: input.modelKey,
      resourceId: input.id,
    })
  }
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function validateRequired(
  systemFields: FieldDefinition[],
  values: Record<string, unknown>,
  customFields: FieldDefinition[],
  custom: Record<string, unknown> | undefined,
) {
  for (const f of systemFields) {
    if (!f.isRequired) continue
    const v = values[f.key]
    if (v === undefined || v === null || v === '') {
      throw new Error(`Field wajib '${f.label}' belum diisi.`)
    }
  }
  for (const f of customFields) {
    if (!f.isRequired) continue
    const v = custom?.[f.key]
    if (v === undefined || v === null || v === '') {
      throw new Error(`Field wajib '${f.label}' belum diisi.`)
    }
  }
}

async function upsertCustomValues(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  modelKey: string,
  recordId: string,
  customFields: FieldDefinition[],
  values: Record<string, unknown>,
): Promise<void> {
  for (const f of customFields) {
    if (!(f.key in values)) continue
    const raw = values[f.key]
    if (raw === null || raw === undefined || raw === '') {
      await tx.execute(sql`
        DELETE FROM platform.record_values
        WHERE tenant_id = ${tenantId} AND model_key = ${modelKey}
          AND record_id = ${recordId} AND field_id = ${f.id}
      `)
      continue
    }
    const cols = coerceForValueColumn(f.typeKey, raw)
    await tx.execute(sql`
      INSERT INTO platform.record_values
        (tenant_id, model_key, record_id, field_id, value_text, value_number, value_date, value_bool, updated_at)
      VALUES
        (${tenantId}, ${modelKey}, ${recordId}, ${f.id},
         ${cols.value_text}, ${cols.value_number}, ${cols.value_date}, ${cols.value_bool}, now())
      ON CONFLICT (tenant_id, model_key, record_id, field_id) DO UPDATE
      SET value_text = EXCLUDED.value_text,
          value_number = EXCLUDED.value_number,
          value_date = EXCLUDED.value_date,
          value_bool = EXCLUDED.value_bool,
          updated_at = now()
    `)
  }
}
