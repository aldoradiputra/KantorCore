-- IS-PLAT Phase 6: Custom views + tenant-created entities.
--
-- platform.records — shared backing table for tenant-defined entities.
--   System models keep their own tables (e.g. contacts.contacts);
--   tenant-defined models all live here, discriminated by model_id.
--
-- platform.views — saved list views per model (filters/sorts/columns).

-- 1. Make platform.models tenant-aware so tenants can register their own
--    entities without colliding with each other or with system models
--    (tenant_id IS NULL = system/global model).
ALTER TABLE platform.models
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Replace the global UNIQUE on key with a composite that allows the same key
-- to exist in different tenants (and once as the system version).
ALTER TABLE platform.models DROP CONSTRAINT IF EXISTS models_key_key;
ALTER TABLE platform.models DROP CONSTRAINT IF EXISTS platform_models_key_key;
DROP INDEX IF EXISTS platform.models_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS platform_models_tenant_key_unique
  ON platform.models (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

CREATE INDEX IF NOT EXISTS platform_models_tenant_idx
  ON platform.models (tenant_id);


CREATE TABLE IF NOT EXISTS platform.records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_id    UUID NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  number      VARCHAR(64),
  name        VARCHAR(255),
  status      VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_records_tenant_model_idx
  ON platform.records (tenant_id, model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_records_tenant_status_idx
  ON platform.records (tenant_id, model_id, status)
  WHERE status IS NOT NULL;

ALTER TABLE platform.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.records FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON platform.records
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

CREATE TABLE IF NOT EXISTS platform.views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_id     UUID NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  name         VARCHAR(128) NOT NULL,
  -- 'list' for now; 'board' / 'calendar' reserved for later phases.
  kind         VARCHAR(32) NOT NULL DEFAULT 'list',
  -- Array of field keys to render as columns: ["name", "email", "phone"]
  columns      JSONB NOT NULL DEFAULT '[]',
  -- Array of filter clauses: [{"field": "status", "op": "eq", "value": "active"}]
  filters      JSONB NOT NULL DEFAULT '[]',
  -- Array of sort clauses: [{"field": "created_at", "dir": "desc"}]
  sorts        JSONB NOT NULL DEFAULT '[]',
  -- Default view for this model (one per tenant+model).
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Shared with all tenant users (vs personal view).
  is_shared    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_views_tenant_model_idx
  ON platform.views (tenant_id, model_id);

-- At most one default per (tenant, model).
CREATE UNIQUE INDEX IF NOT EXISTS platform_views_default_unique
  ON platform.views (tenant_id, model_id)
  WHERE is_default = TRUE;

ALTER TABLE platform.views ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.views FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON platform.views
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );
