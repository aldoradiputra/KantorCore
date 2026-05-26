-- IS-PLAT Phase 1 — Schema-as-data foundation
--
-- Tables: models, field_types, fields, status_states, transitions,
-- sequences, record_values (EAV custom-field values).
--
-- Models are global (system-defined, not tenant-scoped) in this phase.
-- Custom fields are tenant-scoped via a nullable fields.tenant_id
-- (NULL = system field shared by every tenant; non-NULL = tenant custom field).

-- ── 1. models ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.models (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key               varchar(128) NOT NULL UNIQUE,         -- 'platform.contact', 'inv.product'
  label             varchar(128) NOT NULL,
  label_plural      varchar(128) NOT NULL,
  schema_name       varchar(64)  NOT NULL,                -- 'platform' / 'inv'
  table_name        varchar(64)  NOT NULL,                -- physical table name
  has_lines         boolean NOT NULL DEFAULT false,
  has_chatter       boolean NOT NULL DEFAULT false,
  has_audit         boolean NOT NULL DEFAULT true,
  parent_field      varchar(64),                          -- non-null when this is a line model
  numbering_prefix  varchar(16),
  numbering_format  varchar(64),                          -- '{prefix}/{yyyy}/{seq:04d}'
  is_system         boolean NOT NULL DEFAULT true,        -- bundled with the platform
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 2. field_types ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.field_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         varchar(32) NOT NULL UNIQUE,                -- 'text', 'number', 'date', 'select', etc.
  label       varchar(64) NOT NULL,
  storage     varchar(16) NOT NULL,                       -- 'text'|'number'|'date'|'bool'|'json'
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 3. fields ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.fields (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            uuid NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES platform.tenants(id) ON DELETE CASCADE,  -- NULL = system field
  key                 varchar(64) NOT NULL,
  label               varchar(128) NOT NULL,
  type_key            varchar(32) NOT NULL REFERENCES platform.field_types(key),
  is_required         boolean NOT NULL DEFAULT false,
  is_unique           boolean NOT NULL DEFAULT false,     -- per-tenant uniqueness
  is_system           boolean NOT NULL DEFAULT false,     -- backed by a real DB column
  column_name         varchar(64),                        -- set when is_system = true
  related_model_key   varchar(128),                       -- when type_key = 'relation'
  options             jsonb NOT NULL DEFAULT '{}'::jsonb, -- {choices:[...], min, max, ...}
  display_order       integer NOT NULL DEFAULT 0,
  help_text           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
-- A field key is unique within (model, tenant). Tenant-null and tenant-X
-- can each have a field called 'plate' on the same model without collision.
CREATE UNIQUE INDEX IF NOT EXISTS fields_model_tenant_key_unique
  ON platform.fields (model_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), key);
CREATE INDEX IF NOT EXISTS fields_model_idx ON platform.fields (model_id);
CREATE INDEX IF NOT EXISTS fields_tenant_idx ON platform.fields (tenant_id);

-- ── 4. status_states ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.status_states (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        uuid NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  key             varchar(32) NOT NULL,
  label           varchar(128) NOT NULL,
  color           varchar(32),
  is_initial      boolean NOT NULL DEFAULT false,
  is_terminal     boolean NOT NULL DEFAULT false,
  display_order   integer NOT NULL DEFAULT 0,
  UNIQUE (model_id, key)
);

-- ── 5. transitions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.transitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        uuid NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  from_state      varchar(32),                            -- NULL = any state
  to_state        varchar(32) NOT NULL,
  label           varchar(128) NOT NULL,
  required_role   public.membership_role NOT NULL DEFAULT 'member',
  guard_expr      text,                                   -- JSON-encoded guard, future use
  display_order   integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS transitions_model_idx ON platform.transitions (model_id);

-- ── 6. sequences ──────────────────────────────────────────────────────────
-- Per-tenant numbering. period_key isolates resets ('2026' resets yearly).
CREATE TABLE IF NOT EXISTS platform.sequences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  model_id      uuid NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  format        varchar(64) NOT NULL,
  period_key    varchar(16) NOT NULL DEFAULT '',
  current_value integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, model_id, period_key)
);

-- ── 7. record_values (EAV) ────────────────────────────────────────────────
-- Polymorphic: no FK on record_id since model_key may point to many tables.
-- Typed value columns let queries index/filter by type without casting.
CREATE TABLE IF NOT EXISTS platform.record_values (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  model_key     varchar(128) NOT NULL,
  record_id     uuid NOT NULL,
  field_id      uuid NOT NULL REFERENCES platform.fields(id) ON DELETE CASCADE,
  value_text    text,
  value_number  numeric,
  value_date    date,
  value_bool    boolean,
  value_json    jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, model_key, record_id, field_id)
);
CREATE INDEX IF NOT EXISTS record_values_record_idx
  ON platform.record_values (tenant_id, model_key, record_id);
CREATE INDEX IF NOT EXISTS record_values_field_text_idx
  ON platform.record_values (tenant_id, field_id, value_text);
CREATE INDEX IF NOT EXISTS record_values_field_number_idx
  ON platform.record_values (tenant_id, field_id, value_number);
