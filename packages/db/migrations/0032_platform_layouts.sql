-- IS-PLAT Phase 3 — Per-model UI layouts.
--
-- A layout is an ordered list of "blocks" stored as JSON. The renderer
-- walks the blocks and produces a detail/list page from registry metadata.
--
-- tenant_id NULL  = system default (shipped with the platform)
-- tenant_id set   = tenant override
--
-- view_kind: 'detail' renders one record; 'list' renders many.

CREATE TABLE IF NOT EXISTS platform.model_layouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    uuid NOT NULL REFERENCES platform.models(id) ON DELETE CASCADE,
  tenant_id   uuid REFERENCES platform.tenants(id) ON DELETE CASCADE,
  view_kind   varchar(16) NOT NULL,                  -- 'detail' | 'list'
  blocks      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- One default layout per (model, tenant, view_kind). Tenant override
-- (tenant_id IS NOT NULL) takes precedence at read time over system
-- default (tenant_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS model_layouts_unique
  ON platform.model_layouts (
    model_id,
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    view_kind
  );

-- ── Seed system defaults for Contact + Product ────────────────────────────
INSERT INTO platform.model_layouts (model_id, tenant_id, view_kind, blocks, is_system)
SELECT m.id, NULL, 'list',
  jsonb_build_object(
    'columns', jsonb_build_array('name', 'email', 'phone', 'type')
  )::jsonb,
  true
FROM platform.models m
WHERE m.key = 'platform.contact'
ON CONFLICT DO NOTHING;

INSERT INTO platform.model_layouts (model_id, tenant_id, view_kind, blocks, is_system)
SELECT m.id, NULL, 'detail',
  jsonb_build_array(
    jsonb_build_object('type', 'header', 'title_field', 'name', 'subtitle_field', 'email'),
    jsonb_build_object('type', 'fields',
      'fields', jsonb_build_array('type', 'email', 'phone', 'npwp', 'address', 'notes')),
    jsonb_build_object('type', 'custom_fields')
  ),
  true
FROM platform.models m
WHERE m.key = 'platform.contact'
ON CONFLICT DO NOTHING;

INSERT INTO platform.model_layouts (model_id, tenant_id, view_kind, blocks, is_system)
SELECT m.id, NULL, 'list',
  jsonb_build_object(
    'columns', jsonb_build_array('code', 'name', 'type', 'sale_price', 'is_active')
  )::jsonb,
  true
FROM platform.models m
WHERE m.key = 'inv.product'
ON CONFLICT DO NOTHING;

INSERT INTO platform.model_layouts (model_id, tenant_id, view_kind, blocks, is_system)
SELECT m.id, NULL, 'detail',
  jsonb_build_array(
    jsonb_build_object('type', 'header', 'title_field', 'name', 'subtitle_field', 'code'),
    jsonb_build_object('type', 'fields',
      'fields', jsonb_build_array('code', 'type', 'description', 'sale_price', 'cost_price', 'is_active', 'notes')),
    jsonb_build_object('type', 'custom_fields')
  ),
  true
FROM platform.models m
WHERE m.key = 'inv.product'
ON CONFLICT DO NOTHING;
