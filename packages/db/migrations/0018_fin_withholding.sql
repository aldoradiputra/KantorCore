-- Migration 0018: Withholding tax support (Phase 29)
-- Forward-only.

ALTER TABLE fin.taxes ADD COLUMN IF NOT EXISTS is_withholding boolean NOT NULL DEFAULT false;
