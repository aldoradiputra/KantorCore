-- Sales pipeline closure: link to CRM teams + deals, add commercial fields, settings

-- ── Extend sales_orders ───────────────────────────────────────────────────────

ALTER TABLE sales.sales_orders
  ADD COLUMN IF NOT EXISTS team_id          UUID REFERENCES crm.sales_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to      UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_id          UUID REFERENCES crm.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal_amount  BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount       BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount     BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS confirmed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS sales_so_team_idx     ON sales.sales_orders(team_id)     WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_so_assigned_idx ON sales.sales_orders(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_so_deal_idx     ON sales.sales_orders(deal_id)     WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_so_date_idx     ON sales.sales_orders(tenant_id, date);

-- ── Settings (per tenant) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales.settings (
  tenant_id           UUID PRIMARY KEY REFERENCES platform.tenants(id) ON DELETE CASCADE,
  -- numbering
  so_number_prefix    VARCHAR(20) NOT NULL DEFAULT 'SO',
  so_number_format    VARCHAR(50) NOT NULL DEFAULT '{prefix}/{year}/{seq:0000}',
  -- commercial defaults
  default_tax_rate    SMALLINT NOT NULL DEFAULT 11,           -- PPN 11% for ID
  tax_inclusive       BOOLEAN  NOT NULL DEFAULT FALSE,
  default_payment_terms VARCHAR(50) NOT NULL DEFAULT 'Net 30',
  default_currency    VARCHAR(3)  NOT NULL DEFAULT 'IDR',
  -- quotation behavior
  quote_validity_days SMALLINT NOT NULL DEFAULT 30,
  auto_create_invoice BOOLEAN  NOT NULL DEFAULT FALSE,
  -- approval thresholds
  discount_approval_pct SMALLINT NOT NULL DEFAULT 15,         -- discounts >X% need approval
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
