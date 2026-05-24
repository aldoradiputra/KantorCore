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
    db.select().from(modelsTable).where(isNull(modelsTable.tenantId)),
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

/**
 * Load a tenant-scoped (non-system) model definition. Not cached — invoked
 * only when a tenant model is referenced.
 */
async function loadTenantModel(
  tenantId: string,
  predicate: { key?: string; id?: string },
): Promise<ModelDefinition | null> {
  const db = getDb()
  const conds = [eq(modelsTable.tenantId, tenantId)]
  if (predicate.key) conds.push(eq(modelsTable.key, predicate.key))
  if (predicate.id) conds.push(eq(modelsTable.id, predicate.id))
  const [m] = await db.select().from(modelsTable).where(and(...conds)).limit(1)
  if (!m) return null
  const [systemFields, statusStates, transitions] = await Promise.all([
    db
      .select()
      .from(fieldsTable)
      .where(and(eq(fieldsTable.modelId, m.id), isNull(fieldsTable.tenantId)))
      .orderBy(asc(fieldsTable.displayOrder)),
    db.select().from(statusStatesTable).where(eq(statusStatesTable.modelId, m.id)).orderBy(asc(statusStatesTable.displayOrder)),
    db.select().from(transitionsTable).where(eq(transitionsTable.modelId, m.id)).orderBy(asc(transitionsTable.displayOrder)),
  ])
  return { model: m, systemFields, statusStates, transitions }
}

export async function listModels(tenantId?: string): Promise<ModelDefinition[]> {
  if (isExpired()) await loadSystemCache()
  const sys = Array.from(systemCache!.values())
  if (!tenantId) return sys
  const db = getDb()
  const tenantRows = await db.select().from(modelsTable).where(eq(modelsTable.tenantId, tenantId))
  if (tenantRows.length === 0) return sys
  const ids = tenantRows.map((m) => m.id)
  const [fieldRows, stateRows, tranRows] = await Promise.all([
    db.select().from(fieldsTable).where(isNull(fieldsTable.tenantId)).orderBy(asc(fieldsTable.displayOrder)),
    db.select().from(statusStatesTable).orderBy(asc(statusStatesTable.displayOrder)),
    db.select().from(transitionsTable).orderBy(asc(transitionsTable.displayOrder)),
  ])
  const tenantDefs: ModelDefinition[] = tenantRows.map((m) => ({
    model: m,
    systemFields: fieldRows.filter((f) => f.modelId === m.id),
    statusStates: stateRows.filter((s) => s.modelId === m.id),
    transitions: tranRows.filter((t) => t.modelId === m.id),
  }))
  void ids
  return [...sys, ...tenantDefs]
}

export async function getModel(key: string, tenantId?: string): Promise<ModelDefinition | null> {
  if (isExpired()) await loadSystemCache()
  const sys = systemCache!.get(key)
  if (sys) return sys
  if (!tenantId) return null
  return loadTenantModel(tenantId, { key })
}

export async function getModelById(id: string, tenantId?: string): Promise<ModelDefinition | null> {
  if (isExpired()) await loadSystemCache()
  const sys = systemCacheById!.get(id)
  if (sys) return sys
  if (!tenantId) return null
  return loadTenantModel(tenantId, { id })
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
  const def = await getModel(modelKey, tenantId)
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
