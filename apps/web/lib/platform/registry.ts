import 'server-only'
import { eq, isNull, or, asc, and } from 'drizzle-orm'
import {
  models as modelsTable,
  fields as fieldsTable,
  fieldTypes as fieldTypesTable,
  statusStates as statusStatesTable,
  transitions as transitionsTable,
  type Model,
  type FieldRow,
  type StatusState,
  type Transition,
  type FieldType,
} from '@kantorcore/db'
import { getDb } from '../db'

export type FieldDefinition = FieldRow
export type StatusStateDef = StatusState
export type TransitionDef = Transition

export interface ModelDefinition {
  model: Model
  systemFields: FieldDefinition[]
  statusStates: StatusStateDef[]
  transitions: TransitionDef[]
}

/**
 * Module-level cache for system models + fields + states + transitions.
 * Tenant-scoped custom fields are loaded per-call (not cached here) since
 * cache invalidation across the pool would be tricky.
 */
let systemCache: Map<string, ModelDefinition> | null = null
let systemCacheById: Map<string, ModelDefinition> | null = null
let cacheAt = 0
const TTL_MS = 60_000

function isExpired() {
  return !systemCache || Date.now() - cacheAt > TTL_MS
}

async function loadSystemCache(): Promise<void> {
  const db = getDb()
  const [modelRows, fieldRows, stateRows, transitionRows] = await Promise.all([
    db.select().from(modelsTable),
    db.select().from(fieldsTable).where(isNull(fieldsTable.tenantId)).orderBy(asc(fieldsTable.displayOrder)),
    db.select().from(statusStatesTable).orderBy(asc(statusStatesTable.displayOrder)),
    db.select().from(transitionsTable).orderBy(asc(transitionsTable.displayOrder)),
  ])
  const byKey = new Map<string, ModelDefinition>()
  const byId = new Map<string, ModelDefinition>()
  for (const m of modelRows) {
    const def: ModelDefinition = {
      model: m,
      systemFields: fieldRows.filter((f) => f.modelId === m.id),
      statusStates: stateRows.filter((s) => s.modelId === m.id),
      transitions: transitionRows.filter((t) => t.modelId === m.id),
    }
    byKey.set(m.key, def)
    byId.set(m.id, def)
  }
  systemCache = byKey
  systemCacheById = byId
  cacheAt = Date.now()
}

export async function listModels(): Promise<ModelDefinition[]> {
  if (isExpired()) await loadSystemCache()
  return Array.from(systemCache!.values())
}

export async function getModel(key: string): Promise<ModelDefinition | null> {
  if (isExpired()) await loadSystemCache()
  return systemCache!.get(key) ?? null
}

export async function getModelById(id: string): Promise<ModelDefinition | null> {
  if (isExpired()) await loadSystemCache()
  return systemCacheById!.get(id) ?? null
}

export function invalidateRegistry() {
  systemCache = null
  systemCacheById = null
}

/**
 * Returns system + tenant-scoped custom fields for a model.
 * Tenant fields are appended after system fields, ordered by display_order.
 */
export async function listFields(
  modelKey: string,
  tenantId: string,
): Promise<FieldDefinition[]> {
  const def = await getModel(modelKey)
  if (!def) return []
  const db = getDb()
  const customRows = await db
    .select()
    .from(fieldsTable)
    .where(and(eq(fieldsTable.modelId, def.model.id), eq(fieldsTable.tenantId, tenantId)))
    .orderBy(asc(fieldsTable.displayOrder))
  return [...def.systemFields, ...customRows]
}

export async function listFieldTypes(): Promise<FieldType[]> {
  return getDb().select().from(fieldTypesTable)
}
