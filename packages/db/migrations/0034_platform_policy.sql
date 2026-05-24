-- IS-PLAT Phase 5: Policy engine + approvals.
-- platform.custom_roles  — tenant-defined roles beyond owner/admin/member
-- platform.role_assignments  — user ↔ custom_role mapping
-- platform.policies  — declarative allow/deny rules per resource+action+principal
-- platform.approvals  — generic approval requests (typed to any resource)

CREATE TABLE IF NOT EXISTS platform.custom_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key         VARCHAR(64) NOT NULL,
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_custom_roles_tenant_key_unique
  ON platform.custom_roles (tenant_id, key);

CREATE TABLE IF NOT EXISTS platform.role_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES platform.custom_roles(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES public.users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_role_assignments_unique
  ON platform.role_assignments (tenant_id, user_id, role_id);

CREATE INDEX IF NOT EXISTS platform_role_assignments_user_idx
  ON platform.role_assignments (tenant_id, user_id);

DO $$ BEGIN
  CREATE TYPE platform.policy_effect AS ENUM ('allow', 'deny');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform.policy_principal_type AS ENUM ('any', 'membership_role', 'custom_role', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS platform.policies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             VARCHAR(128) NOT NULL,
  description      TEXT,
  -- Resource match. Supports prefix-wildcard via trailing ':*'
  -- Examples: 'records:contact', 'records:*', 'flow:instance', 'fin.invoice'
  resource         VARCHAR(128) NOT NULL,
  -- Action being authorized. Supports '*' for any action.
  -- Examples: 'create', 'read', 'update', 'delete', 'transition:posted', '*'
  action           VARCHAR(64) NOT NULL,
  effect           platform.policy_effect NOT NULL DEFAULT 'allow',
  principal_type   platform.policy_principal_type NOT NULL DEFAULT 'any',
  -- For 'membership_role': 'owner'|'admin'|'member'
  -- For 'custom_role': custom_roles.key
  -- For 'user': users.id (text)
  -- For 'any': NULL
  principal_id     VARCHAR(128),
  -- Optional condition tree evaluated against context. Empty = always matches.
  -- Shape: { "field": { "op": "...", "value": ... }, ... }
  conditions       JSONB NOT NULL DEFAULT '{}',
  -- Higher priority evaluated first; deny beats allow at equal priority.
  priority         INTEGER NOT NULL DEFAULT 100,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_policies_tenant_resource_idx
  ON platform.policies (tenant_id, resource, action, is_active);

DO $$ BEGIN
  CREATE TYPE platform.approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS platform.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- e.g. 'fin.invoice', 'flow.instance', 'platform.contact'
  resource_type   VARCHAR(64) NOT NULL,
  resource_id     UUID NOT NULL,
  -- Action being requested, e.g. 'post', 'approve', 'advance_step'
  action          VARCHAR(64) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  requester_id    UUID REFERENCES public.users(id),
  -- Which role(s) can decide. NULL = any admin/owner.
  required_role   VARCHAR(64),
  status          platform.approval_status NOT NULL DEFAULT 'pending',
  decided_by      UUID REFERENCES public.users(id),
  decided_at      TIMESTAMPTZ,
  decision_notes  TEXT,
  -- Free-form context to render and use post-decision (e.g. step_run_id)
  context         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_approvals_tenant_status_idx
  ON platform.approvals (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_approvals_resource_idx
  ON platform.approvals (tenant_id, resource_type, resource_id);

-- RLS
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['custom_roles', 'role_assignments', 'policies', 'approvals']
  LOOP
    EXECUTE format('ALTER TABLE platform.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE platform.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($q$
      CREATE POLICY "tenant_isolation" ON platform.%I
        USING (
          COALESCE(current_setting('app.tenant_id', true), '') <> ''
          AND tenant_id = current_setting('app.tenant_id', true)::uuid
        )
        WITH CHECK (
          COALESCE(current_setting('app.tenant_id', true), '') <> ''
          AND tenant_id = current_setting('app.tenant_id', true)::uuid
        )
    $q$, t);
  END LOOP;
END $$;
