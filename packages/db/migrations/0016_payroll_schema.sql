-- Migration 0016: IS-PAY Payroll schema
-- Forward-only. All objects guarded with IF NOT EXISTS.

CREATE SCHEMA IF NOT EXISTS pay;

DO $$ BEGIN
  CREATE TYPE pay_run_status AS ENUM ('draft', 'posted', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pay_line_kind AS ENUM ('earning', 'deduction');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS pay.pay_runs (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  code                       varchar(30) NOT NULL,
  period_start               date NOT NULL,
  period_end                 date NOT NULL,
  description                text,
  status                     pay_run_status NOT NULL DEFAULT 'draft',
  journal_entry_id           uuid REFERENCES fin.journal_entries(id) ON DELETE SET NULL,
  payment_journal_entry_id   uuid REFERENCES fin.journal_entries(id) ON DELETE SET NULL,
  created_by                 uuid NOT NULL REFERENCES platform.users(id) ON DELETE RESTRICT,
  posted_at                  timestamptz,
  paid_at                    timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pay_run_tenant_code_uniq UNIQUE (tenant_id, code),
  CONSTRAINT pay_run_period_chk CHECK (period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS pay_run_tenant_period_idx ON pay.pay_runs (tenant_id, period_start);

CREATE TABLE IF NOT EXISTS pay.payslips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  pay_run_id      uuid NOT NULL REFERENCES pay.pay_runs(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES hr.employees(id) ON DELETE RESTRICT,
  employee_name   varchar(200) NOT NULL,
  position        varchar(200),
  gross_total     bigint NOT NULL DEFAULT 0 CHECK (gross_total >= 0),
  deduction_total bigint NOT NULL DEFAULT 0 CHECK (deduction_total >= 0),
  net_total       bigint NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pay_slip_run_emp_uniq UNIQUE (pay_run_id, employee_id)
);
CREATE INDEX IF NOT EXISTS pay_slip_run_idx ON pay.payslips (pay_run_id);

CREATE TABLE IF NOT EXISTS pay.payslip_lines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  payslip_id uuid NOT NULL REFERENCES pay.payslips(id) ON DELETE CASCADE,
  kind       pay_line_kind NOT NULL,
  name       varchar(100) NOT NULL,
  amount     bigint NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pay_line_payslip_idx ON pay.payslip_lines (payslip_id);

ALTER TABLE pay.pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay.payslip_lines ENABLE ROW LEVEL SECURITY;
