-- IS-TIME: Timesheet Entries (Phase 24)
-- Employees log hours against optional project/issue. Stored in the existing
-- `hr` schema. Forward-only migration.

CREATE TABLE IF NOT EXISTS "hr"."timesheet_entries" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "employee_id"      uuid NOT NULL REFERENCES "hr"."employees"("id") ON DELETE CASCADE,
  "project_id"       uuid,
  "issue_id"         uuid,
  "date"             date NOT NULL,
  "duration_minutes" integer NOT NULL CHECK ("duration_minutes" > 0),
  "description"      text,
  "billable"         boolean NOT NULL DEFAULT true,
  "created_by"       uuid NOT NULL REFERENCES "platform"."users"("id") ON DELETE RESTRICT,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ts_tenant_idx"    ON "hr"."timesheet_entries" ("tenant_id");
CREATE INDEX IF NOT EXISTS "ts_employee_idx"  ON "hr"."timesheet_entries" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "ts_date_idx"      ON "hr"."timesheet_entries" ("tenant_id", "date");
CREATE INDEX IF NOT EXISTS "ts_project_idx"   ON "hr"."timesheet_entries" ("project_id");
