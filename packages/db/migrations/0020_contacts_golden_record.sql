-- Migration 0020: platform.contacts — golden record
-- One row per "person or organization" the workspace interacts with.
-- Replaces denormalized name/email columns across hr, fin, rent modules.

-- Enums
DO $$ BEGIN
  CREATE TYPE platform.platform_contact_type AS ENUM ('person', 'organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform.platform_contact_role AS ENUM ('staff', 'customer', 'vendor', 'lead', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contacts table
CREATE TABLE IF NOT EXISTS platform.contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  type        platform.platform_contact_type NOT NULL DEFAULT 'person',
  name        varchar(200) NOT NULL,
  email       varchar(254),
  phone       varchar(32),
  npwp        varchar(25),
  address     text,
  notes       text,
  user_id     uuid REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_email_unique ON platform.contacts (tenant_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_user_unique ON platform.contacts (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS contacts_tenant_id_idx ON platform.contacts (tenant_id);
CREATE INDEX IF NOT EXISTS contacts_name_idx ON platform.contacts (tenant_id, name);

-- Contact roles (M:N — a contact can be customer AND vendor)
CREATE TABLE IF NOT EXISTS platform.contact_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  uuid NOT NULL REFERENCES platform.contacts(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  role        platform.platform_contact_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_roles_contact_role_unique ON platform.contact_roles (contact_id, role);
CREATE INDEX IF NOT EXISTS contact_roles_tenant_id_idx ON platform.contact_roles (tenant_id);

-- Add contact_id FK columns to consuming tables (nullable for back-compat)
ALTER TABLE hr.employees      ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES platform.contacts(id) ON DELETE SET NULL;
ALTER TABLE fin.invoices      ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES platform.contacts(id) ON DELETE SET NULL;
ALTER TABLE fin.bills         ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES platform.contacts(id) ON DELETE SET NULL;
ALTER TABLE rent.customers    ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES platform.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS hr_emp_contact_idx     ON hr.employees    (contact_id);
CREATE INDEX IF NOT EXISTS fin_inv_contact_idx    ON fin.invoices    (contact_id);
CREATE INDEX IF NOT EXISTS fin_bill_contact_idx   ON fin.bills       (contact_id);
CREATE INDEX IF NOT EXISTS rcust_contact_idx      ON rent.customers  (contact_id);
