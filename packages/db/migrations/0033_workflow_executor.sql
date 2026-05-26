-- IS-FLOW Phase 4: Workflow executor runtime tables.
-- process_instances = one running "case" of a process template.
-- process_run_steps = per-step execution records for an instance.

DO $$ BEGIN
  CREATE TYPE flow.instance_status AS ENUM (
    'pending',
    'running',
    'paused',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flow.step_run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'skipped',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS flow.process_instances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  process_id            UUID NOT NULL REFERENCES flow.process_templates(id),
  -- The record that kicked off this instance (e.g. the SO that was confirmed)
  trigger_record_type   VARCHAR(64),
  trigger_record_id     UUID,
  status                flow.instance_status NOT NULL DEFAULT 'pending',
  current_sequence      INTEGER NOT NULL DEFAULT 0,
  -- Arbitrary context passed between steps (populated record IDs, etc.)
  context               JSONB NOT NULL DEFAULT '{}',
  started_by            UUID REFERENCES platform.users(id),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  error                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flow_instances_tenant_process_idx
  ON flow.process_instances (tenant_id, process_id, status);

CREATE INDEX IF NOT EXISTS flow_instances_trigger_record_idx
  ON flow.process_instances (tenant_id, trigger_record_type, trigger_record_id);

CREATE TABLE IF NOT EXISTS flow.process_run_steps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  instance_id           UUID NOT NULL REFERENCES flow.process_instances(id) ON DELETE CASCADE,
  step_id               UUID NOT NULL REFERENCES flow.process_steps(id),
  sequence              INTEGER NOT NULL,
  status                flow.step_run_status NOT NULL DEFAULT 'pending',
  -- For action steps: the record type/id that was created
  outcome_record_type   VARCHAR(64),
  outcome_record_id     UUID,
  -- Actor who completed (for human steps)
  completed_by          UUID REFERENCES platform.users(id),
  notes                 TEXT,
  error                 TEXT,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flow_run_steps_instance_idx
  ON flow.process_run_steps (instance_id, sequence);

ALTER TABLE flow.process_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.process_run_steps ENABLE ROW LEVEL SECURITY;
