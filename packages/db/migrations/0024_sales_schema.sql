-- Migration 0024: IS-SALES — Quotations & Sales Orders (P38)

CREATE SCHEMA IF NOT EXISTS sales;

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE sales.so_status AS ENUM ('quotation','confirmed','done','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Sales Orders ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales.sales_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  so_number     VARCHAR(32) NOT NULL,
  status        sales.so_status NOT NULL DEFAULT 'quotation',
  contact_id    UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  customer_name VARCHAR(200) NOT NULL,
  date          DATE NOT NULL,
  expiry_date   DATE,
  notes         TEXT,
  invoice_id    UUID,
  created_by    UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_so_tenant_idx
  ON sales.sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS sales_so_tenant_status_idx
  ON sales.sales_orders(tenant_id, status);

-- ── SO Lines ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales.so_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  so_id         UUID NOT NULL REFERENCES sales.sales_orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES inv.products(id) ON DELETE SET NULL,
  product_type  VARCHAR(20),
  description   VARCHAR(500) NOT NULL,
  qty           INTEGER NOT NULL,
  unit_price    INTEGER NOT NULL,
  account_id    UUID REFERENCES fin.accounts(id) ON DELETE SET NULL,
  tax_ids       TEXT[] NOT NULL DEFAULT '{}',
  delivered_qty INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS sales_sol_so_idx ON sales.so_lines(so_id);

ALTER TABLE sales.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.so_lines     ENABLE ROW LEVEL SECURITY;
