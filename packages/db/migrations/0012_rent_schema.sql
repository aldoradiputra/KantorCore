-- IS-RENT: Rental & Property Management schema (Phase 23)
-- Single schema serves equipment rental, vehicle rental, and PMS via
-- the `category` enum + `metadata` jsonb. Forward-only migration.

CREATE SCHEMA IF NOT EXISTS "rent";

DO $$ BEGIN
  CREATE TYPE "rent_asset_category" AS ENUM ('equipment', 'vehicle', 'property', 'room', 'venue', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "rent_asset_status" AS ENUM ('available', 'reserved', 'rented', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "rent_customer_type" AS ENUM ('individual', 'business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "rent_reservation_status" AS ENUM ('draft', 'confirmed', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "rent_rate_unit" AS ENUM ('hour', 'day', 'week', 'month');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Assets ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rent"."assets" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "asset_code"      varchar(50),
  "name"            varchar(255) NOT NULL,
  "category"        rent_asset_category NOT NULL DEFAULT 'equipment',
  "status"          rent_asset_status NOT NULL DEFAULT 'available',
  "description"     text,
  "location"        varchar(255),
  "hourly_rate"     bigint,
  "daily_rate"      bigint,
  "weekly_rate"     bigint,
  "monthly_rate"    bigint,
  "deposit_amount"  bigint,
  "metadata"        jsonb NOT NULL DEFAULT '{}',
  "photos"          jsonb NOT NULL DEFAULT '[]',
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "asset_tenant_idx" ON "rent"."assets" ("tenant_id");
CREATE INDEX IF NOT EXISTS "asset_cat_idx"    ON "rent"."assets" ("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "asset_status_idx" ON "rent"."assets" ("tenant_id", "status");

-- ── Customers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rent"."customers" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"      uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "name"           varchar(255) NOT NULL,
  "customer_type"  rent_customer_type NOT NULL DEFAULT 'individual',
  "email"          varchar(255),
  "phone"          varchar(30),
  "address"        text,
  "id_number"      varchar(25),
  "notes"          text,
  "created_at"     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rcust_tenant_idx" ON "rent"."customers" ("tenant_id");

-- ── Reservations / Bookings / Leases ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rent"."reservations" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"          uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "asset_id"           uuid NOT NULL REFERENCES "rent"."assets"("id") ON DELETE RESTRICT,
  "customer_id"        uuid NOT NULL REFERENCES "rent"."customers"("id") ON DELETE RESTRICT,
  "status"             rent_reservation_status NOT NULL DEFAULT 'draft',
  "start_at"           timestamptz NOT NULL,
  "end_at"             timestamptz NOT NULL,
  "actual_start_at"    timestamptz,
  "actual_end_at"      timestamptz,
  "rate_amount"        bigint NOT NULL DEFAULT 0,
  "rate_unit"          rent_rate_unit NOT NULL DEFAULT 'day',
  "total_amount"       bigint NOT NULL DEFAULT 0,
  "deposit_amount"     bigint NOT NULL DEFAULT 0,
  "deposit_returned"   boolean NOT NULL DEFAULT false,
  "notes"              text,
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "resv_dates_ok" CHECK ("end_at" > "start_at")
);

CREATE INDEX IF NOT EXISTS "resv_tenant_idx" ON "rent"."reservations" ("tenant_id");
CREATE INDEX IF NOT EXISTS "resv_asset_idx"  ON "rent"."reservations" ("asset_id", "start_at");
CREATE INDEX IF NOT EXISTS "resv_status_idx" ON "rent"."reservations" ("tenant_id", "status");
