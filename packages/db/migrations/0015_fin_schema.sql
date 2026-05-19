-- Migration 0015: IS-FIN Finance & Accounting schema
-- Forward-only. All objects guarded with IF NOT EXISTS.

CREATE SCHEMA IF NOT EXISTS fin;

-- Enums
DO $$ BEGIN
  CREATE TYPE fin_account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fin_entry_status AS ENUM ('draft', 'posted', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fin_doc_status AS ENUM ('draft', 'confirmed', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS fin.accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  code           varchar(20) NOT NULL,
  name           varchar(200) NOT NULL,
  type           fin_account_type NOT NULL,
  parent_id      uuid REFERENCES fin.accounts(id) ON DELETE SET NULL,
  is_active      boolean NOT NULL DEFAULT true,
  is_reconcilable boolean NOT NULL DEFAULT false,
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_acct_tenant_code_uniq UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS fin_acct_tenant_idx ON fin.accounts (tenant_id);

-- Journal Entries
CREATE TABLE IF NOT EXISTS fin.journal_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  entry_number   varchar(30) NOT NULL,
  date           date NOT NULL,
  description    text NOT NULL,
  status         fin_entry_status NOT NULL DEFAULT 'draft',
  reference_type varchar(50),
  reference_id   uuid,
  created_by     uuid NOT NULL REFERENCES platform.users(id) ON DELETE RESTRICT,
  posted_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_je_tenant_date_idx ON fin.journal_entries (tenant_id, date);
CREATE INDEX IF NOT EXISTS fin_je_ref_idx ON fin.journal_entries (reference_type, reference_id);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS fin.journal_entry_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  entry_id    uuid NOT NULL REFERENCES fin.journal_entries(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES fin.accounts(id) ON DELETE RESTRICT,
  description text,
  debit       bigint NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit      bigint NOT NULL DEFAULT 0 CHECK (credit >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_jel_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

CREATE INDEX IF NOT EXISTS fin_jel_entry_idx ON fin.journal_entry_lines (entry_id);
CREATE INDEX IF NOT EXISTS fin_jel_account_idx ON fin.journal_entry_lines (account_id);

-- Customer Invoices (AR)
CREATE TABLE IF NOT EXISTS fin.invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  invoice_number   varchar(50) NOT NULL,
  status           fin_doc_status NOT NULL DEFAULT 'draft',
  customer_name    varchar(200) NOT NULL,
  customer_email   varchar(254),
  date             date NOT NULL,
  due_date         date NOT NULL,
  notes            text,
  journal_entry_id uuid REFERENCES fin.journal_entries(id) ON DELETE SET NULL,
  created_by       uuid NOT NULL REFERENCES platform.users(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_inv_tenant_status_idx ON fin.invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS fin_inv_tenant_date_idx ON fin.invoices (tenant_id, date);

-- Invoice Lines
CREATE TABLE IF NOT EXISTS fin.invoice_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  invoice_id   uuid NOT NULL REFERENCES fin.invoices(id) ON DELETE CASCADE,
  description  varchar(300) NOT NULL,
  quantity     integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   bigint NOT NULL CHECK (unit_price >= 0),
  account_id   uuid NOT NULL REFERENCES fin.accounts(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_invl_invoice_idx ON fin.invoice_lines (invoice_id);

-- Vendor Bills (AP)
CREATE TABLE IF NOT EXISTS fin.bills (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  bill_number      varchar(50) NOT NULL,
  status           fin_doc_status NOT NULL DEFAULT 'draft',
  vendor_name      varchar(200) NOT NULL,
  vendor_ref       varchar(100),
  date             date NOT NULL,
  due_date         date NOT NULL,
  notes            text,
  journal_entry_id uuid REFERENCES fin.journal_entries(id) ON DELETE SET NULL,
  created_by       uuid NOT NULL REFERENCES platform.users(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_bill_tenant_status_idx ON fin.bills (tenant_id, status);
CREATE INDEX IF NOT EXISTS fin_bill_tenant_date_idx ON fin.bills (tenant_id, date);

-- Bill Lines
CREATE TABLE IF NOT EXISTS fin.bill_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  bill_id      uuid NOT NULL REFERENCES fin.bills(id) ON DELETE CASCADE,
  description  varchar(300) NOT NULL,
  quantity     integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   bigint NOT NULL CHECK (unit_price >= 0),
  account_id   uuid NOT NULL REFERENCES fin.accounts(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_billl_bill_idx ON fin.bill_lines (bill_id);

-- RLS (deferred — same pattern as other modules)
ALTER TABLE fin.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.bill_lines ENABLE ROW LEVEL SECURITY;
