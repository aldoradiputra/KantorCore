/**
 * Platform model metadata — machine-readable descriptions of every entity
 * in KantorCore. Read by IS-AGENT for introspection and (eventually) by the
 * Record Kit to drive ListView / FormView / KanbanView rendering.
 *
 * These declarations DO NOT yet drive UI. They mirror the bespoke modules
 * that exist today. The contract is: if a field is added to the DB, it's
 * added here too. The metadata is the single source of truth for "what
 * this system contains" from an agent's perspective.
 */

// ── i18n label ────────────────────────────────────────────────────────────────

/** Multilingual inline label. Add more locales here as needed. */
export interface I18nLabel {
  id: string   // Bahasa Indonesia (required — primary language)
  en?: string  // English (optional)
}

// ── Field type system ─────────────────────────────────────────────────────────

export type FieldType =
  | 'text'         // short string
  | 'longtext'     // multi-line plain string
  | 'html'         // rich text (TipTap JSON)
  | 'integer'
  | 'decimal'
  | 'monetary'     // amount + currency (default IDR)
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'         // bounded choices, see `options`
  | 'many2one'     // FK to another entity, see `target`
  | 'one2many'     // reverse FK / lines, see `target` + `inverseField`
  | 'many2many'    // join table relation, see `target`
  | 'file'
  | 'image'
  | 'signature'
  | 'json'         // freeform structured data
  | 'tags'         // free-form string array
  | 'phone'
  | 'email'
  | 'url'
  | 'address'
  | 'computed'     // code-defined, evaluated server-side — see `compute`
  | 'ai-field'     // LLM-generated at field write time — see `ai`

export type FieldWidget =
  | 'text' | 'textarea' | 'rich-text'
  | 'monetary' | 'percent' | 'rating' | 'progress'
  | 'priority' | 'badge' | 'color' | 'tag-input'
  | 'select' | 'radio' | 'checkbox'
  | 'date-picker' | 'datetime-picker' | 'date-range'
  | 'avatar-select' | 'reference'
  | 'image-upload' | 'file-upload' | 'signature-pad'
  | 'json-editor'
  | 'address-form'

// ── Computed field ────────────────────────────────────────────────────────────

/**
 * Code-computed field. Two modes:
 *
 * `formula` — a simple arithmetic expression (e.g. "qty * unitPrice").
 *   Evaluated by a formula micro-engine on the server. Covers 80% of
 *   computed-total patterns without custom code.
 *
 * `function` — a named server function registered in the compute registry
 *   (apps/web/lib/platform/compute/<module>.ts). Use this for anything that
 *   requires DB access, external calls, or complex logic. The function
 *   signature is always:
 *     async (record: Record<string, unknown>, ctx: TenantContext) => unknown
 *
 * `store: true` — persist the result to a DB column (requires a real column).
 * `store: false` (default) — evaluate at read time, never stored.
 */
export interface ComputeSpec {
  mode: 'formula' | 'function'
  /** Arithmetic expression referencing sibling field names. */
  expression?: string
  /** Identifier of a registered compute function: 'finance.computeTotal'. */
  fn?: string
  /** Field names that trigger recomputation when changed. */
  deps: string[]
  /** Persist result to DB. Requires a corresponding DB column. */
  store?: boolean
}

// ── AI field ──────────────────────────────────────────────────────────────────

/**
 * LLM-generated field value. The agent runs the prompt with the listed
 * input fields as context and writes the result back to this field.
 *
 * `trigger`:
 *   'on_create'  — generate once when the record is first saved
 *   'on_change'  — regenerate whenever any `inputFields` changes
 *   'on_demand'  — only when explicitly requested (user clicks "Generate")
 *
 * `store: true` (default) — result is persisted; avoids re-generation on
 *   every read and gives users a stable, editable value.
 */
export interface AiFieldSpec {
  /** System prompt fragment describing what to generate (Indonesian). */
  prompt: string
  /** Field names used as inputs when building the prompt context. */
  inputFields: string[]
  model?: 'sonnet' | 'haiku' | 'opus'
  trigger?: 'on_create' | 'on_change' | 'on_demand'
  store?: boolean
}

// ── Field metadata ────────────────────────────────────────────────────────────

export interface FieldMeta {
  /** Internal field name; matches the DB column (camelCase). */
  name: string
  /** Human label. */
  label: I18nLabel
  type: FieldType
  /** Optional widget override; if absent, sensible default for the type. */
  widget?: FieldWidget
  required?: boolean
  readonly?: boolean
  default?: unknown
  /** Inline choices for `enum`. */
  options?: { value: string; label: I18nLabel }[]
  /** Target entity name for relational fields ('platform.user'). */
  target?: string
  /** For `one2many`, the FK field name on the target side. */
  inverseField?: string
  /** Currency code for `monetary`. Defaults to 'IDR'. */
  currency?: string
  /**
   * Help text shown to the agent as reasoning context.
   * Write for an LLM audience: explain the business purpose, constraints,
   * and how this field relates to others.
   */
  help?: string
  /** Short tooltip shown to human users in the UI. */
  tooltip?: string
  /** Include this field in global full-text search. */
  searchable?: boolean
  /** Spec for type: 'computed'. */
  compute?: ComputeSpec
  /** Spec for type: 'ai-field'. */
  ai?: AiFieldSpec
}

// ── View metadata ─────────────────────────────────────────────────────────────

/**
 * Form layout: an array of rows. Each row is either a single field name
 * (full-width) or an array of field names (split equally across columns).
 * Tabs group rows under labels.
 */
export type FormRow = string | string[]
export interface FormTab {
  id: string
  label: I18nLabel
  rows: FormRow[]
}

export interface ListViewMeta {
  columns: string[]
  defaultSort?: { field: string; direction: 'asc' | 'desc' }
  /** Field names that drive filter chips in the list header. */
  filters?: string[]
}

export interface FormViewMeta {
  /** Top-level rows shown above tabs (typically title + key status fields). */
  rows?: FormRow[]
  tabs?: FormTab[]
}

export interface KanbanViewMeta {
  groupBy: string
  cardTitle: string
  cardFields?: string[]
}

export interface ViewMeta {
  list?: ListViewMeta
  form?: FormViewMeta
  kanban?: KanbanViewMeta
}

// ── Permissions ───────────────────────────────────────────────────────────────

/**
 * Role tiers:
 *   admin      — tenant administrator
 *   member     — regular authenticated user
 *   agent      — IS-AGENT acting on behalf of a logged-in user;
 *                inherits that user's tenant + role context.
 *                The human is present and accountable.
 *   autonomous — background IS-AGENT with no live user session
 *                (scheduled tasks, automations, monitoring).
 *                Needs explicit grant per entity. Narrower defaults.
 *   owner      — the user who created the record (dynamic)
 *   public     — unauthenticated (portal / widget visitors)
 */
export type Role = 'admin' | 'member' | 'agent' | 'autonomous' | 'owner' | 'public'

export interface PermissionMeta {
  create?: Role[]
  read?:   Role[]
  update?: Role[]
  delete?: Role[]
}

// ── Model ─────────────────────────────────────────────────────────────────────

export interface ModelMeta {
  /** Namespaced identifier: 'hd.ticket', 'crm.deal'. Stable; never rename. */
  entity: string
  /** Owning module code ('IS-HD', 'IS-CRM'). */
  module: string
  label: I18nLabel
  pluralLabel: I18nLabel
  /** Field name used as the human-readable record title. */
  displayField: string
  fields: Record<string, FieldMeta>
  views: ViewMeta
  perms: PermissionMeta
  /** Does this entity participate in polymorphic chatter (log notes + email)? */
  chatter?: boolean
  /** Does this entity support scheduled activities (independently of chatter)? */
  activities?: boolean
  /**
   * Entity-level description for the agent. Explain the business purpose,
   * relationships to other entities, and common operations.
   */
  help?: string
}
