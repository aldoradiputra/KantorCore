-- fin.journals, fin.payment_terms, fin.payment_term_lines,
-- fin.reconciliation_models, fin.bank_statements, fin.statement_records,
-- fin.indonesian_banks

DO $$ BEGIN
  CREATE TYPE journal_type AS ENUM ('sale', 'purchase', 'bank', 'cash', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS fin.journals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  code            VARCHAR(5)  NOT NULL,
  name            VARCHAR(100) NOT NULL,
  type            journal_type NOT NULL DEFAULT 'general',
  currency_code   VARCHAR(10) NOT NULL DEFAULT 'IDR',
  bank_account_id UUID,
  sequence_prefix VARCHAR(20),
  is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS fin_journal_tenant_code_uniq ON fin.journals (tenant_id, code);
CREATE INDEX IF NOT EXISTS fin_journal_tenant_idx ON fin.journals (tenant_id);

CREATE TABLE IF NOT EXISTS fin.payment_terms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name              varchar(100) NOT NULL,
  note              text,
  complex_logic_code text,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_pt_tenant_idx ON fin.payment_terms (tenant_id);

CREATE TABLE IF NOT EXISTS fin.payment_term_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_term_id uuid NOT NULL REFERENCES fin.payment_terms (id) ON DELETE CASCADE,
  sequence        integer NOT NULL DEFAULT 0,
  value_percent   numeric(5,2) NOT NULL,
  days_offset     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_ptl_pt_idx ON fin.payment_term_lines (payment_term_id);

DO $$ BEGIN
  CREATE TYPE recon_model_type AS ENUM ('suggest', 'auto_match');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS fin.reconciliation_models (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name          varchar(100) NOT NULL,
  type          recon_model_type NOT NULL DEFAULT 'suggest',
  tolerance     numeric(12,2) NOT NULL DEFAULT 0.00,
  match_label   boolean NOT NULL DEFAULT TRUE,
  match_partner boolean NOT NULL DEFAULT FALSE,
  same_currency boolean NOT NULL DEFAULT TRUE,
  active        boolean NOT NULL DEFAULT TRUE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_recon_model_tenant_idx ON fin.reconciliation_models (tenant_id);

DO $$ BEGIN
  CREATE TYPE statement_status AS ENUM ('draft', 'processing', 'reconciled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS fin.bank_statements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  journal_id       uuid NOT NULL REFERENCES fin.journals (id) ON DELETE RESTRICT,
  account_number   varchar(50),
  starting_balance numeric(15,2) NOT NULL DEFAULT 0.00,
  ending_balance   numeric(15,2) NOT NULL DEFAULT 0.00,
  date_from        date NOT NULL,
  date_to          date NOT NULL,
  status           statement_status NOT NULL DEFAULT 'draft',
  records_count    integer NOT NULL DEFAULT 0,
  reconciled_at    timestamptz,
  created_by       uuid NOT NULL REFERENCES platform.users (id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_stmt_tenant_idx  ON fin.bank_statements (tenant_id);
CREATE INDEX IF NOT EXISTS fin_stmt_status_idx  ON fin.bank_statements (tenant_id, status);

CREATE TABLE IF NOT EXISTS fin.statement_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  statement_id     uuid NOT NULL REFERENCES fin.bank_statements (id) ON DELETE CASCADE,
  date             date NOT NULL,
  amount           numeric(15,2) NOT NULL,
  partner_id       uuid,
  reference        text,
  notes            text,
  cleared          boolean NOT NULL DEFAULT FALSE,
  journal_entry_id uuid REFERENCES fin.journal_entries (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_sr_stmt_idx    ON fin.statement_records (statement_id);
CREATE INDEX IF NOT EXISTS fin_sr_cleared_idx ON fin.statement_records (tenant_id, cleared);

CREATE TABLE IF NOT EXISTS fin.indonesian_banks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       varchar(10) NOT NULL UNIQUE,
  name       varchar(100) NOT NULL,
  swift_code varchar(11),
  active     boolean NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS fin_bank_code_uniq ON fin.indonesian_banks (code);
