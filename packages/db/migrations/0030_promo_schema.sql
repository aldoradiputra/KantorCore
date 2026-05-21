-- IS-PROMO: Sales Promotions, Vouchers, Gift Cards
-- Migration 0030

CREATE SCHEMA IF NOT EXISTS promo;

-- ── Enums ──────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE promo.discount_type AS ENUM (
    'fixed_amount',
    'percentage',
    'tiered',
    'bogo',
    'bundle'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE promo.promo_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE promo.voucher_type AS ENUM ('code', 'gift_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Promotions ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo.promotions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  discount_type  promo.discount_type NOT NULL DEFAULT 'percentage',
  -- discount_config shapes:
  --   percentage:   { percent: number }
  --   fixed_amount: { amount: number }
  --   tiered:       { tiers: [{min_qty: n, percent: n}] }
  --   bogo:         { buy_qty: n, get_qty: n, get_percent: n }
  --   bundle:       { product_ids: [...], bundle_price: n }
  discount_config JSONB NOT NULL DEFAULT '{}',
  -- conditions shape: { customer_ids?, product_ids?, category_ids?,
  --   min_order_value?, max_order_value?, min_qty?, segment_tag? }
  conditions     JSONB NOT NULL DEFAULT '{}',
  custom_formula TEXT,           -- optional sandboxed JS for complex logic
  status         promo.promo_status NOT NULL DEFAULT 'inactive',
  valid_from     DATE,
  valid_to       DATE,
  priority       INT NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promo_promotions_tenant_idx    ON promo.promotions(tenant_id);
CREATE INDEX IF NOT EXISTS promo_promotions_tenant_status ON promo.promotions(tenant_id, status);

-- ── Vouchers & Gift Cards ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo.vouchers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  promotion_id   UUID REFERENCES promo.promotions(id) ON DELETE SET NULL,
  voucher_type   promo.voucher_type NOT NULL DEFAULT 'code',
  code           TEXT NOT NULL,
  -- For gift cards: balance tracks remaining credit (in minor currency units)
  initial_balance INT,           -- NULL for promo vouchers
  balance         INT,           -- NULL for promo vouchers
  -- For promo vouchers: override discount (NULL = use promotion's config)
  discount_override_pct  INT,    -- 0-100
  discount_override_amt  INT,    -- minor units
  contact_id     UUID REFERENCES contacts.contacts(id) ON DELETE SET NULL,
  max_uses       INT,
  usage_count    INT NOT NULL DEFAULT 0,
  valid_from     DATE,
  valid_to       DATE,
  notes          TEXT,
  created_by     UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS promo_vouchers_tenant_idx  ON promo.vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS promo_vouchers_code_idx    ON promo.vouchers(tenant_id, code);
CREATE INDEX IF NOT EXISTS promo_vouchers_contact_idx ON promo.vouchers(tenant_id, contact_id);

-- ── Promotion Use Audit ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo.promotion_uses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  promotion_id   UUID REFERENCES promo.promotions(id) ON DELETE SET NULL,
  voucher_id     UUID REFERENCES promo.vouchers(id) ON DELETE SET NULL,
  so_id          UUID,           -- references sales.sales_orders(id) — cross-schema FK not enforced here
  contact_id     UUID REFERENCES contacts.contacts(id) ON DELETE SET NULL,
  discount_given INT NOT NULL,   -- minor currency units
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promo_uses_tenant_idx     ON promo.promotion_uses(tenant_id);
CREATE INDEX IF NOT EXISTS promo_uses_promotion_idx  ON promo.promotion_uses(promotion_id);
CREATE INDEX IF NOT EXISTS promo_uses_so_idx         ON promo.promotion_uses(so_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE promo.promotions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo.vouchers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo.promotion_uses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY promo_promotions_tenant_isolation     ON promo.promotions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY promo_vouchers_tenant_isolation       ON promo.vouchers
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY promo_uses_tenant_isolation           ON promo.promotion_uses
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
