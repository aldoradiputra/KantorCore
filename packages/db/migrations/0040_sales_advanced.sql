-- Phase A: Global Product Master extensions + Sales advanced fields
-- Implements: variants, UoM conversions, packagings, multi-warehouse lines,
-- recurring lines, three-way matching, down payment, fiscal positions,
-- incoterms, customer reference, signature, UTM, commission rules

-- ── Product Attributes (e.g. "Color", "Size") ──────────────────────────────

CREATE TABLE IF NOT EXISTS inv.product_attributes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name          VARCHAR(64) NOT NULL,
  display_type  VARCHAR(20) NOT NULL DEFAULT 'select',   -- 'select' | 'color' | 'radio'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX inv_attr_tenant_idx ON inv.product_attributes(tenant_id);

CREATE TABLE IF NOT EXISTS inv.product_attribute_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id  UUID NOT NULL REFERENCES inv.product_attributes(id) ON DELETE CASCADE,
  value         VARCHAR(128) NOT NULL,                   -- e.g. "Red", "Small"
  color_hex     VARCHAR(7),                              -- optional for color attrs
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (attribute_id, value)
);
CREATE INDEX inv_attr_val_attr_idx ON inv.product_attribute_values(attribute_id);

-- ── Product Variants ─────────────────────────────────────────────────────────
-- A variant = product template + specific combination of attribute values
-- e.g. "T-Shirt" + [Red, Small]. The product is the template; variants are SKUs.

CREATE TABLE IF NOT EXISTS inv.product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES inv.products(id) ON DELETE CASCADE,
  sku             VARCHAR(64),
  barcode         VARCHAR(64),
  -- attribute combination stored as ordered array of attribute_value_ids
  attribute_value_ids UUID[] NOT NULL DEFAULT '{}',
  -- per-variant price overrides; NULL = use parent product.sale_price
  sale_price      BIGINT,
  cost_price      BIGINT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inv_var_product_idx ON inv.product_variants(product_id);
CREATE INDEX inv_var_tenant_idx  ON inv.product_variants(tenant_id);
CREATE UNIQUE INDEX inv_var_sku_idx ON inv.product_variants(tenant_id, sku) WHERE sku IS NOT NULL;

-- Links a product (template) to the attributes it supports
CREATE TABLE IF NOT EXISTS inv.product_attribute_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES inv.products(id) ON DELETE CASCADE,
  attribute_id    UUID NOT NULL REFERENCES inv.product_attributes(id) ON DELETE CASCADE,
  UNIQUE (product_id, attribute_id)
);

-- ── UoM Conversions ──────────────────────────────────────────────────────────
-- Maps a product's alternate UoM to its base UoM via a multiplier.
-- e.g. 1 Box of "Widget" = 12 Pcs. base_uom = Pcs, alt_uom = Box, factor = 12.

CREATE TABLE IF NOT EXISTS inv.product_uom_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES inv.products(id) ON DELETE CASCADE,
  alt_uom_id      UUID NOT NULL REFERENCES inv.uom(id) ON DELETE RESTRICT,
  factor          NUMERIC(12, 4) NOT NULL,                -- alt_qty * factor = base_qty
  UNIQUE (product_id, alt_uom_id)
);
CREATE INDEX inv_uom_conv_product_idx ON inv.product_uom_conversions(product_id);

-- ── Packagings (predefined pack sizes) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS inv.product_packagings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES inv.products(id) ON DELETE CASCADE,
  name            VARCHAR(64) NOT NULL,                    -- "Box of 12"
  qty_per_package INTEGER NOT NULL,                        -- 12
  barcode         VARCHAR(64),
  is_default      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX inv_pkg_product_idx ON inv.product_packagings(product_id);

-- ── Fiscal Positions ─────────────────────────────────────────────────────────
-- Maps source taxes to target taxes based on customer location/rules.

CREATE TABLE IF NOT EXISTS sales.fiscal_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,                   -- "Domestic", "Export", "VAT-exempt"
  description     TEXT,
  -- Auto-application rules
  auto_apply      BOOLEAN NOT NULL DEFAULT FALSE,
  country_code    VARCHAR(3),                              -- ISO 3166-1 alpha-3 ("IDN", "SGP")
  vat_required    BOOLEAN,                                 -- match customers with/without VAT
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sales_fp_tenant_idx ON sales.fiscal_positions(tenant_id);

CREATE TABLE IF NOT EXISTS sales.fiscal_position_tax_maps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_position_id  UUID NOT NULL REFERENCES sales.fiscal_positions(id) ON DELETE CASCADE,
  source_tax_id       UUID NOT NULL,                       -- tax that would normally apply
  target_tax_id       UUID,                                -- replacement; NULL = remove tax
  UNIQUE (fiscal_position_id, source_tax_id)
);

-- ── SO Header Extensions ─────────────────────────────────────────────────────

ALTER TABLE sales.sales_orders
  ADD COLUMN IF NOT EXISTS customer_reference   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS incoterm             VARCHAR(8),
  ADD COLUMN IF NOT EXISTS fiscal_position_id   UUID REFERENCES sales.fiscal_positions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS down_payment_pct     SMALLINT,
  ADD COLUMN IF NOT EXISTS down_payment_amount  BIGINT,
  ADD COLUMN IF NOT EXISTS dp_invoice_id        UUID,
  ADD COLUMN IF NOT EXISTS utm_source           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_medium           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_campaign         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS requires_signature   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_name       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS signed_by_ip         VARCHAR(45),
  ADD COLUMN IF NOT EXISTS signature_token      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS approval_state       VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS approval_required_by UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id           UUID;

CREATE UNIQUE INDEX IF NOT EXISTS sales_so_sig_token_idx
  ON sales.sales_orders(signature_token) WHERE signature_token IS NOT NULL;

-- ── SO Line Extensions ───────────────────────────────────────────────────────

ALTER TABLE sales.so_lines
  ADD COLUMN IF NOT EXISTS product_variant_id   UUID REFERENCES inv.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uom_id               UUID REFERENCES inv.uom(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_id         UUID REFERENCES inv.stock_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS packaging_id         UUID REFERENCES inv.product_packagings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoiced_qty         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_pct         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurring_interval   VARCHAR(20),               -- 'monthly' | 'quarterly' | 'annual' | NULL
  ADD COLUMN IF NOT EXISTS recurring_count      SMALLINT,                  -- number of billing cycles (NULL = perpetual)
  ADD COLUMN IF NOT EXISTS next_billing_date    DATE,
  ADD COLUMN IF NOT EXISTS line_sequence        SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sales_sol_warehouse_idx ON sales.so_lines(warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_sol_variant_idx   ON sales.so_lines(product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_sol_recurring_idx ON sales.so_lines(next_billing_date) WHERE recurring_interval IS NOT NULL;

-- ── Commission Rules ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales.commission_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  basis           VARCHAR(20) NOT NULL DEFAULT 'revenue',  -- 'revenue' | 'margin'
  rate_pct        NUMERIC(5, 2) NOT NULL,                  -- 5.00 = 5%
  -- scope filters
  user_id         UUID REFERENCES platform.users(id) ON DELETE CASCADE,
  team_id         UUID REFERENCES crm.sales_teams(id) ON DELETE CASCADE,
  product_category_id UUID REFERENCES inv.product_categories(id) ON DELETE CASCADE,
  -- trigger
  trigger_event   VARCHAR(20) NOT NULL DEFAULT 'invoice_paid', -- 'invoice_validated' | 'invoice_paid'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  priority        SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sales_comm_tenant_idx ON sales.commission_rules(tenant_id);
CREATE INDEX sales_comm_user_idx   ON sales.commission_rules(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sales.commission_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  rule_id         UUID NOT NULL REFERENCES sales.commission_rules(id) ON DELETE RESTRICT,
  so_id           UUID REFERENCES sales.sales_orders(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES platform.users(id) ON DELETE RESTRICT,
  basis_amount    BIGINT NOT NULL,                         -- revenue or margin amount the rule applied to
  commission_amount BIGINT NOT NULL,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ,
  notes           TEXT
);
CREATE INDEX sales_comm_entry_user_idx ON sales.commission_entries(user_id, earned_at DESC);
CREATE INDEX sales_comm_entry_so_idx   ON sales.commission_entries(so_id);

-- ── Settings extension (incoterm, fiscal default) ────────────────────────────

ALTER TABLE sales.settings
  ADD COLUMN IF NOT EXISTS default_incoterm           VARCHAR(8),
  ADD COLUMN IF NOT EXISTS default_fiscal_position_id UUID REFERENCES sales.fiscal_positions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_invoice_on_payment    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_policy             VARCHAR(20) NOT NULL DEFAULT 'ordered'; -- 'ordered' | 'delivered'
