-- IS-BLOCKS: Portal/KMS block-based layout system
-- Blocks are ordered content regions attached to a tenant layout scope

CREATE SCHEMA IF NOT EXISTS blocks;

-- ── Block types ───────────────────────────────────────────────────────────────
-- text, heading, image, cta_button, divider, articles_list,
-- tickets_list, gift_cards_grid, field, custom_html

CREATE TYPE blocks.block_type AS ENUM (
  'text',
  'heading',
  'image',
  'cta_button',
  'divider',
  'articles_list',
  'tickets_list',
  'gift_cards_grid',
  'field',
  'custom_html'
);

-- ── Layout scopes ─────────────────────────────────────────────────────────────
-- A layout is a named container (e.g. "portal_dashboard", "portal_help_home")
-- Each tenant can have one layout per scope.

CREATE TABLE IF NOT EXISTS blocks.layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  scope       TEXT NOT NULL,          -- e.g. "portal_dashboard", "portal_help_home"
  label       TEXT NOT NULL,          -- human-readable name
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocks_layouts_tenant_scope UNIQUE (tenant_id, scope)
);

CREATE INDEX IF NOT EXISTS blocks_layouts_tenant_idx ON blocks.layouts (tenant_id);

-- ── Blocks ────────────────────────────────────────────────────────────────────
-- Each block belongs to exactly one layout and is positioned by `position` ASC.

CREATE TABLE IF NOT EXISTS blocks.blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  layout_id   UUID NOT NULL REFERENCES blocks.layouts(id) ON DELETE CASCADE,
  type        blocks.block_type NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  config      JSONB NOT NULL DEFAULT '{}',  -- block-type-specific settings
  visible     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blocks_blocks_layout_idx ON blocks.blocks (layout_id, position);
CREATE INDEX IF NOT EXISTS blocks_blocks_tenant_idx ON blocks.blocks (tenant_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE blocks.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks.blocks  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS
CREATE POLICY blocks_layouts_service ON blocks.layouts USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY blocks_blocks_service  ON blocks.blocks  USING (TRUE) WITH CHECK (TRUE);
