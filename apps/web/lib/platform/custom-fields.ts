import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import {
  fields as fieldsTable,
  recordValues as recordValuesTable,
  type FieldRow,
} from '@kantorcore/db'
import { withTenant } from '../db'
import { getModel, invalidateRegistry } from './registry'

export interface CreateCustomFieldInput {
  tenantId: string
  modelKey: string
  key: string
  label: string
  typeKey: string
  isRequired?: boolean
  options?: Record<string, unknown>
  helpText?: string
  displayOrder?: number
}

export async function createCustomField(input: CreateCustomFieldInput): Promise<FieldRow> {
  const def = await getModel(input.modelKey)
  if (!def) throw new Error(`Unknown model: ${input.modelKey}`)
  if (!/^[a-z][a-z0-9_]*$/.test(input.key)) {
    throw new Error('Field key harus lowercase, mulai dengan huruf, hanya a-z 0-9 _.')
  }
  // No collision with system field keys
  if (def.systemFields.some((f) => f.key === input.key)) {
    throw new Error(`Field key '${input.key}' bentrok dengan field sistem.`)
  }
  return withTenant(input.tenantId, async (tx) => {
    // No collision with tenant-existing custom fields
    const existing = await tx
      .select()
      .from(fieldsTable)
      .where(
        and(
          eq(fieldsTable.modelId, def.model.id),
          eq(fieldsTable.tenantId, input.tenantId),
          eq(fieldsTable.key, input.key),
        ),
      )
      .limit(1)
    if (existing.length) throw new Error(`Field '${input.key}' sudah ada.`)
    const [row] = await tx
      .insert(fieldsTable)
      .values({
        modelId: def.model.id,
        tenantId: input.tenantId,
        key: input.key,
        label: input.label,
        typeKey: input.typeKey,
        isRequired: input.isRequired ?? false,
        isSystem: false,
        options: input.options ?? {},
        helpText: input.helpText ?? null,
        displayOrder: input.displayOrder ?? 100,
      })
      .returning()
    return row!
  })
}

export async function deleteCustomField(tenantId: string, fieldId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    // Safety: only allow deletion of tenant-owned, non-system fields
    const [field] = await tx
      .select()
      .from(fieldsTable)
      .where(and(eq(fieldsTable.id, fieldId), eq(fieldsTable.tenantId, tenantId)))
      .limit(1)
    if (!field || field.isSystem) throw new Error('Field tidak ditemukan atau adalah field sistem.')
    await tx.delete(fieldsTable).where(eq(fieldsTable.id, fieldId))
  })
}

// ── Value read/write ────────────────────────────────────────────────────────

export type FieldValue = string | number | boolean | Date | null

function pickValueColumn(typeKey: string, value: FieldValue) {
  if (value === null || value === undefined) {
    return { valueText: null, valueNumber: null, valueDate: null, valueBool: null }
  }
  switch (typeKey) {
    case 'number':
    case 'currency':
      return { valueNumber: String(Number(value)), valueText: null, valueDate: null, valueBool: null }
    case 'bool':
      return { valueBool: Boolean(value), valueText: null, valueNumber: null, valueDate: null }
    case 'date':
      return {
        valueDate: value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
        valueText: null, valueNumber: null, valueBool: null,
      }
    default:
      return { valueText: String(value), valueNumber: null, valueDate: null, valueBool: null }
  }
}

export function extractValue(typeKey: string, row: {
  valueText: string | null
  valueNumber: string | null
  valueDate: string | null
  valueBool: boolean | null
}): FieldValue {
  switch (typeKey) {
    case 'number':
    case 'currency':
      return row.valueNumber == null ? null : Number(row.valueNumber)
    case 'bool':
      return row.valueBool
    case 'date':
      return row.valueDate
    default:
      return row.valueText
  }
}

export async function getRecordValues(
  tenantId: string,
  modelKey: string,
  recordId: string,
): Promise<Record<string, FieldValue>> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        fieldId: recordValuesTable.fieldId,
        valueText: recordValuesTable.valueText,
        valueNumber: recordValuesTable.valueNumber,
        valueDate: recordValuesTable.valueDate,
        valueBool: recordValuesTable.valueBool,
        fieldKey: fieldsTable.key,
        fieldType: fieldsTable.typeKey,
      })
      .from(recordValuesTable)
      .innerJoin(fieldsTable, eq(fieldsTable.id, recordValuesTable.fieldId))
      .where(
        and(
          eq(recordValuesTable.tenantId, tenantId),
          eq(recordValuesTable.modelKey, modelKey),
          eq(recordValuesTable.recordId, recordId),
        ),
      )
    const out: Record<string, FieldValue> = {}
    for (const r of rows) {
      out[r.fieldKey] = extractValue(r.fieldType, r)
    }
    return out
  })
}

export async function setRecordValue(
  tenantId: string,
  modelKey: string,
  recordId: string,
  fieldId: string,
  value: FieldValue,
): Promise<void> {
  return withTenant(tenantId, async (tx) => {
    const [field] = await tx
      .select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, fieldId))
      .limit(1)
    if (!field) throw new Error('Field not found.')
    const cols = pickValueColumn(field.typeKey, value)
    // If value is null, remove the row entirely
    if (value === null || value === undefined || value === '') {
      await tx
        .delete(recordValuesTable)
        .where(
          and(
            eq(recordValuesTable.tenantId, tenantId),
            eq(recordValuesTable.modelKey, modelKey),
            eq(recordValuesTable.recordId, recordId),
            eq(recordValuesTable.fieldId, fieldId),
          ),
        )
      return
    }
    await tx
      .insert(recordValuesTable)
      .values({
        tenantId,
        modelKey,
        recordId,
        fieldId,
        ...cols,
      })
      .onConflictDoUpdate({
        target: [
          recordValuesTable.tenantId,
          recordValuesTable.modelKey,
          recordValuesTable.recordId,
          recordValuesTable.fieldId,
        ],
        set: { ...cols, updatedAt: new Date() },
      })
  })
}

export { invalidateRegistry }
