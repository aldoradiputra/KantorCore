-- Migration 0019: Workspace admin tables
-- Groups, group members, directory profiles, security policy

-- Groups
CREATE TABLE IF NOT EXISTS platform.groups (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name           varchar(128) NOT NULL,
  description    text,
  email_alias    varchar(128),
  created_by     uuid NOT NULL REFERENCES platform.users(id) ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS groups_tenant_name_unique ON platform.groups (tenant_id, name);
CREATE INDEX IF NOT EXISTS groups_tenant_id_idx ON platform.groups (tenant_id);

-- Group members
CREATE TABLE IF NOT EXISTS platform.group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES platform.groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS group_members_group_user_unique ON platform.group_members (group_id, user_id);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON platform.group_members (group_id);
CREATE INDEX IF NOT EXISTS group_members_tenant_id_idx ON platform.group_members (tenant_id);

-- Directory profiles (tenant-scoped user org fields)
CREATE TABLE IF NOT EXISTS platform.directory_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  department   varchar(128),
  job_title    varchar(128),
  manager_id   uuid REFERENCES platform.users(id) ON DELETE SET NULL,
  employee_id  varchar(64),
  phone        varchar(32),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS directory_profiles_tenant_user_unique ON platform.directory_profiles (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS directory_profiles_tenant_id_idx ON platform.directory_profiles (tenant_id);

-- Workspace security policy (one row per tenant)
CREATE TABLE IF NOT EXISTS platform.workspace_security_policy (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL UNIQUE REFERENCES platform.tenants(id) ON DELETE CASCADE,
  require_2fa           boolean NOT NULL DEFAULT false,
  password_min_length   integer NOT NULL DEFAULT 8,
  session_timeout_hours integer NOT NULL DEFAULT 720,
  ip_allowlist          text[] NOT NULL DEFAULT '{}',
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES platform.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS workspace_security_policy_tenant_id_idx ON platform.workspace_security_policy (tenant_id);
