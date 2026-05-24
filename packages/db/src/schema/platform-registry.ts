import {
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  date,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { membershipRole } from './memberships'

/**
 * IS-PLAT Phase 1 — Schema-as-data foundation.
 *
 * Every entity in the system is defined by a row in `platform.models` plus
 * field/state/transition rows. System models are seeded; tenants may add
 * custom fields per model. Custom-field VALUES live in `platform.record_values`
 * (EAV) so they can be indexed and queried per-type.
 */

// ── models ──────────────────────────────────────────────────────────────────
export const models = platform.table('models', {
  id:               uuid('id').primaryKey().defaultRandom(),
  key:              varchar('key', { length: 128 }).notNull().unique(),
  label:            varchar('label', { length: 128 }).notNull(),
  labelPlural:      varchar('label_plural', { length: 128 }).notNull(),
  schemaName:       varchar('schema_name', { length: 64 }).notNull(),
  tableName:        varchar('table_name', { length: 64 }).notNull(),
  hasLines:         boolean('has_lines').notNull().default(false),
  hasChatter:       boolean('has_chatter').notNull().default(false),
  hasAudit:         boolean('has_audit').notNull().default(true),
  parentField:      varchar('parent_field', { length: 64 }),
  numberingPrefix:  varchar('numbering_prefix', { length: 16 }),
  numberingFormat:  varchar('numbering_format', { length: 64 }),
  isSystem:         boolean('is_system').notNull().default(true),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── field_types ─────────────────────────────────────────────────────────────
export const fieldTypes = platform.table('field_types', {
  id:         uuid('id').primaryKey().defaultRandom(),
  key:        varchar('key', { length: 32 }).notNull().unique(),
  label:      varchar('label', { length: 64 }).notNull(),
  storage:    varchar('storage', { length: 16 }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── fields ──────────────────────────────────────────────────────────────────
export const fields = platform.table(
  'fields',
  {
    id:                uuid('id').primaryKey().defaultRandom(),
    modelId:           uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
    tenantId:          uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    key:               varchar('key', { length: 64 }).notNull(),
    label:             varchar('label', { length: 128 }).notNull(),
    typeKey:           varchar('type_key', { length: 32 }).notNull().references(() => fieldTypes.key),
    isRequired:        boolean('is_required').notNull().default(false),
    isUnique:          boolean('is_unique').notNull().default(false),
    isSystem:          boolean('is_system').notNull().default(false),
    columnName:        varchar('column_name', { length: 64 }),
    relatedModelKey:   varchar('related_model_key', { length: 128 }),
    options:           jsonb('options').notNull().default({}),
    displayOrder:      integer('display_order').notNull().default(0),
    helpText:          text('help_text'),
    createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    modelIdx:  index('fields_model_idx').on(t.modelId),
    tenantIdx: index('fields_tenant_idx').on(t.tenantId),
  }),
)

// ── status_states ───────────────────────────────────────────────────────────
export const statusStates = platform.table(
  'status_states',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    modelId:       uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
    key:           varchar('key', { length: 32 }).notNull(),
    label:         varchar('label', { length: 128 }).notNull(),
    color:         varchar('color', { length: 32 }),
    isInitial:     boolean('is_initial').notNull().default(false),
    isTerminal:    boolean('is_terminal').notNull().default(false),
    displayOrder:  integer('display_order').notNull().default(0),
  },
  (t) => ({
    modelKeyUnique: uniqueIndex('status_states_model_key_unique').on(t.modelId, t.key),
  }),
)

// ── transitions ─────────────────────────────────────────────────────────────
export const transitions = platform.table(
  'transitions',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    modelId:       uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
    fromState:     varchar('from_state', { length: 32 }),
    toState:       varchar('to_state', { length: 32 }).notNull(),
    label:         varchar('label', { length: 128 }).notNull(),
    requiredRole:  membershipRole('required_role').notNull().default('member'),
    guardExpr:     text('guard_expr'),
    displayOrder:  integer('display_order').notNull().default(0),
  },
  (t) => ({
    modelIdx: index('transitions_model_idx').on(t.modelId),
  }),
)

// ── sequences ───────────────────────────────────────────────────────────────
export const sequences = platform.table(
  'sequences',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    tenantId:      uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    modelId:       uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
    format:        varchar('format', { length: 64 }).notNull(),
    periodKey:     varchar('period_key', { length: 16 }).notNull().default(''),
    currentValue:  integer('current_value').notNull().default(0),
    updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantModelPeriodUnique: uniqueIndex('sequences_tenant_model_period_unique').on(
      t.tenantId,
      t.modelId,
      t.periodKey,
    ),
  }),
)

// ── record_values (EAV) ─────────────────────────────────────────────────────
export const recordValues = platform.table(
  'record_values',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    modelKey:     varchar('model_key', { length: 128 }).notNull(),
    recordId:     uuid('record_id').notNull(),
    fieldId:      uuid('field_id').notNull().references(() => fields.id, { onDelete: 'cascade' }),
    valueText:    text('value_text'),
    valueNumber:  numeric('value_number'),
    valueDate:    date('value_date'),
    valueBool:    boolean('value_bool'),
    valueJson:    jsonb('value_json'),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    recordIdx: index('record_values_record_idx').on(t.tenantId, t.modelKey, t.recordId),
    uniqueFieldPerRecord: uniqueIndex('record_values_unique')
      .on(t.tenantId, t.modelKey, t.recordId, t.fieldId),
  }),
)

// ── model_layouts ───────────────────────────────────────────────────────────
export const modelLayouts = platform.table(
  'model_layouts',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    modelId:    uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
    tenantId:   uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    viewKind:   varchar('view_kind', { length: 16 }).notNull(),
    blocks:     jsonb('blocks').notNull().default([]),
    isSystem:   boolean('is_system').notNull().default(true),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    modelTenantViewIdx: index('model_layouts_model_tenant_view_idx').on(t.modelId, t.tenantId, t.viewKind),
  }),
)

export type ModelLayout = typeof modelLayouts.$inferSelect

export type Model = typeof models.$inferSelect
export type FieldType = typeof fieldTypes.$inferSelect
export type FieldRow = typeof fields.$inferSelect
export type StatusState = typeof statusStates.$inferSelect
export type Transition = typeof transitions.$inferSelect
export type Sequence = typeof sequences.$inferSelect
export type RecordValue = typeof recordValues.$inferSelect
