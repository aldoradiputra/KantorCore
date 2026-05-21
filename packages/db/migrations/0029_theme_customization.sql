-- IS-THEME (P46): Theme & Appearance customization
-- - User appearance: light/dark mode + accent color preset
-- - Tenant branding: custom logo URL, brand color, login background URL
--
-- File storage: URLs only for now. A future Storage Provider (Supabase/S3/etc.)
-- will be wired in via a single lib boundary; schema is provider-agnostic.

-- User appearance preferences
ALTER TABLE platform.users
  ADD COLUMN IF NOT EXISTS theme_mode    TEXT NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS accent_color  TEXT NOT NULL DEFAULT 'indigo';

DO $$ BEGIN
  ALTER TABLE platform.users
    ADD CONSTRAINT users_theme_mode_chk
    CHECK (theme_mode IN ('light', 'dark'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE platform.users
    ADD CONSTRAINT users_accent_color_chk
    CHECK (accent_color IN ('indigo','teal','purple','rose','amber','emerald'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant branding (admin-controlled)
ALTER TABLE platform.tenants
  ADD COLUMN IF NOT EXISTS logo_url      TEXT,
  ADD COLUMN IF NOT EXISTS brand_color   TEXT,         -- hex e.g. '#3B4FC4'
  ADD COLUMN IF NOT EXISTS login_bg_url  TEXT;

DO $$ BEGIN
  ALTER TABLE platform.tenants
    ADD CONSTRAINT tenants_brand_color_chk
    CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
