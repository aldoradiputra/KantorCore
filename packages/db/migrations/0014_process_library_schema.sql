-- IS-FLOW: Process Library (Phase 25)
-- The docs/templates layer that IS-FLOW will eventually animate. Same rows
-- feed both the read-only Process Library view (now) and the runtime
-- execution engine (later). Forward-only migration.

CREATE SCHEMA IF NOT EXISTS "flow";

DO $$ BEGIN
  CREATE TYPE "flow_process_mode" AS ENUM ('deterministic', 'probabilistic', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "flow_step_kind" AS ENUM ('trigger', 'action', 'decision', 'human', 'agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "flow"."process_templates" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "slug"             varchar(64) NOT NULL,
  "name"             varchar(255) NOT NULL,
  "module"           varchar(32) NOT NULL,
  "mode"             "flow_process_mode" NOT NULL,
  "description"      text,
  "manifest_version" integer NOT NULL DEFAULT 1,
  "is_system"        boolean NOT NULL DEFAULT true,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "flow_process_templates_tenant_slug_unique"
  ON "flow"."process_templates" ("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "flow_process_templates_tenant_module_idx"
  ON "flow"."process_templates" ("tenant_id", "module");

CREATE TABLE IF NOT EXISTS "flow"."process_steps" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "process_id"            uuid NOT NULL REFERENCES "flow"."process_templates"("id") ON DELETE CASCADE,
  "sequence"              integer NOT NULL,
  "kind"                  "flow_step_kind" NOT NULL,
  "mode"                  "flow_process_mode" NOT NULL,
  "name"                  varchar(255) NOT NULL,
  "description"           text,
  "trigger"               text,
  "produces_record_type"  varchar(64),
  "required_role"         varchar(64),
  "reversible"            boolean NOT NULL DEFAULT false,
  "audit_event"           varchar(64),
  "created_at"            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "flow_process_steps_process_seq_unique"
  ON "flow"."process_steps" ("process_id", "sequence");
CREATE INDEX IF NOT EXISTS "flow_process_steps_tenant_id_idx"
  ON "flow"."process_steps" ("tenant_id");
