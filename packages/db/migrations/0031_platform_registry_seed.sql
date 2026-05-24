-- IS-PLAT Phase 1 — Seed system models for Contact + Product.
--
-- These are the first two registry-driven models. Detail pages remain
-- hand-coded for now; the registry powers custom-field definitions and
-- (in Phase 2) the generic CRUD route and (Phase 3) the generic renderer.

-- ── Field types ───────────────────────────────────────────────────────────
INSERT INTO platform.field_types (key, label, storage) VALUES
  ('text',     'Teks',          'text'),
  ('longtext', 'Teks panjang',  'text'),
  ('number',   'Angka',         'number'),
  ('currency', 'Mata uang',     'number'),
  ('date',     'Tanggal',       'date'),
  ('bool',     'Ya/Tidak',      'bool'),
  ('select',   'Pilihan',       'text'),
  ('email',    'Email',         'text'),
  ('phone',    'Telepon',       'text'),
  ('relation', 'Relasi',        'text')
ON CONFLICT (key) DO NOTHING;

-- ── Model: platform.contact ───────────────────────────────────────────────
INSERT INTO platform.models
  (key, label, label_plural, schema_name, table_name, has_lines, has_chatter, has_audit, is_system)
VALUES
  ('platform.contact', 'Kontak', 'Kontak', 'platform', 'contacts', false, true, true, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform.fields
  (model_id, tenant_id, key, label, type_key, is_required, is_system, column_name, display_order)
SELECT m.id, NULL, f.key, f.label, f.type_key, f.is_required, true, f.column_name, f.display_order
FROM platform.models m
CROSS JOIN (VALUES
  ('type',    'Tipe',     'select', false, 'type',     10),
  ('name',    'Nama',     'text',   true,  'name',     20),
  ('email',   'Email',    'email',  false, 'email',    30),
  ('phone',   'Telepon',  'phone',  false, 'phone',    40),
  ('npwp',    'NPWP',     'text',   false, 'npwp',     50),
  ('address', 'Alamat',   'longtext', false, 'address', 60),
  ('notes',   'Catatan',  'longtext', false, 'notes',   70)
) AS f(key, label, type_key, is_required, column_name, display_order)
WHERE m.key = 'platform.contact'
ON CONFLICT DO NOTHING;

-- ── Model: inv.product ────────────────────────────────────────────────────
INSERT INTO platform.models
  (key, label, label_plural, schema_name, table_name, has_lines, has_chatter, has_audit, is_system)
VALUES
  ('inv.product', 'Produk', 'Produk', 'inv', 'products', false, true, true, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform.fields
  (model_id, tenant_id, key, label, type_key, is_required, is_system, column_name, display_order)
SELECT m.id, NULL, f.key, f.label, f.type_key, f.is_required, true, f.column_name, f.display_order
FROM platform.models m
CROSS JOIN (VALUES
  ('code',         'Kode/SKU',    'text',     false, 'code',         10),
  ('name',         'Nama',        'text',     true,  'name',         20),
  ('description',  'Deskripsi',   'longtext', false, 'description',  30),
  ('type',         'Tipe',        'select',   true,  'type',         40),
  ('sale_price',   'Harga Jual',  'currency', false, 'sale_price',   50),
  ('cost_price',   'Harga Pokok', 'currency', false, 'cost_price',   60),
  ('is_active',    'Aktif',       'bool',     false, 'is_active',    70),
  ('notes',        'Catatan',     'longtext', false, 'notes',        80)
) AS f(key, label, type_key, is_required, column_name, display_order)
WHERE m.key = 'inv.product'
ON CONFLICT DO NOTHING;
