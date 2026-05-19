-- IS-HR: HR & Employees schema (Phase 21)
-- Forward-only migration. Adds hr schema, departments, and employees tables.

CREATE SCHEMA IF NOT EXISTS "hr";

DO $$ BEGIN
  CREATE TYPE "hr_employment_type" AS ENUM ('full_time', 'part_time', 'contract', 'intern');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "hr_employee_status" AS ENUM ('active', 'inactive', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "hr"."departments" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "name"       varchar(255) NOT NULL,
  "parent_id"  uuid REFERENCES "hr"."departments"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dept_tenant_idx" ON "hr"."departments" ("tenant_id");

CREATE TABLE IF NOT EXISTS "hr"."employees" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "employee_code"         varchar(50),
  "name"                  varchar(255) NOT NULL,
  "email"                 varchar(255),
  "phone"                 varchar(30),
  "nik"                   varchar(20),
  "npwp"                  varchar(25),
  "bpjs_ketenagakerjaan"  varchar(25),
  "bpjs_kesehatan"        varchar(25),
  "department_id"         uuid REFERENCES "hr"."departments"("id") ON DELETE SET NULL,
  "position"              varchar(255),
  "employment_type"       hr_employment_type NOT NULL DEFAULT 'full_time',
  "status"                hr_employee_status NOT NULL DEFAULT 'active',
  "hire_date"             date,
  "termination_date"      date,
  "notes"                 text,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "emp_tenant_idx"  ON "hr"."employees" ("tenant_id");
CREATE INDEX IF NOT EXISTS "emp_dept_idx"    ON "hr"."employees" ("department_id");
CREATE INDEX IF NOT EXISTS "emp_status_idx"  ON "hr"."employees" ("tenant_id", "status");
