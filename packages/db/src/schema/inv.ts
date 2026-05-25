import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
  integer,
  bigint,
  smallint,
  numeric,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { accounts } from './fin'

export const inv = pgSchema('inv')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const productType = pgEnum('inv_product_type', [
  'product',      // stockable physical goods
  'service',      // intangible, never stocked
  'consumable',   // physical but not tracked in stock
])

// ── Product Categories ────────────────────────────────────────────────────────

export const productCategories = inv.table('product_categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  parentId:    uuid('parent_id'),  // self-ref FK — Drizzle limitation: add in migration directly
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('inv_cat_tenant_idx').on(t.tenantId),
  tenantNameIdx: uniqueIndex('inv_cat_tenant_name_idx').on(t.tenantId, t.name),
}))

export type ProductCategory = typeof productCategories.$inferSelect
export type NewProductCategory = typeof productCategories.$inferInsert

// ── Units of Measure ──────────────────────────────────────────────────────────

export const uom = inv.table('uom', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:      varchar('name', { length: 64 }).notNull(),   // e.g. "Pcs", "Kg", "Liter"
  symbol:    varchar('symbol', { length: 16 }),            // e.g. "pcs", "kg", "L"
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('inv_uom_tenant_idx').on(t.tenantId),
  tenantNameIdx: uniqueIndex('inv_uom_tenant_name_idx').on(t.tenantId, t.name),
}))

export type Uom = typeof uom.$inferSelect
export type NewUom = typeof uom.$inferInsert

// ── Products ──────────────────────────────────────────────────────────────────

export const products = inv.table('products', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code:       varchar('code', { length: 64 }),            // SKU / product code
  name:       varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type:       productType('type').notNull().default('product'),
  categoryId: uuid('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  uomId:      uuid('uom_id').references(() => uom.id, { onDelete: 'set null' }),

  // Pricing (IDR, no decimals)
  salePrice:  integer('sale_price').notNull().default(0),
  costPrice:  integer('cost_price').notNull().default(0),

  // Default accounts for journal entries
  revenueAccountId: uuid('revenue_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  expenseAccountId: uuid('expense_account_id').references(() => accounts.id, { onDelete: 'set null' }),

  // Default tax IDs stored as text array (resolved at runtime)
  defaultSaleTaxIds:     text('default_sale_tax_ids').array().notNull().default([]),
  defaultPurchaseTaxIds: text('default_purchase_tax_ids').array().notNull().default([]),

  isActive:   boolean('is_active').notNull().default(true),
  notes:      text('notes'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:       index('inv_prod_tenant_idx').on(t.tenantId),
  tenantActiveIdx: index('inv_prod_tenant_active_idx').on(t.tenantId, t.isActive),
  tenantCodeIdx:   uniqueIndex('inv_prod_tenant_code_idx').on(t.tenantId, t.code),
}))

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type ProductTypeValue = (typeof productType.enumValues)[number]

// ── Stock Enums ───────────────────────────────────────────────────────────────

export const stockLocationType = pgEnum('inv_stock_location_type', [
  'internal',   // owned warehouse / bin / shelf
  'external',   // vendor or customer — moves to/from here represent receipts/deliveries
  'virtual',    // inventory adjustments, scrap, transit
])

export const stockMoveState = pgEnum('inv_stock_move_state', [
  'draft',
  'done',
  'cancelled',
])

// ── Stock Locations ───────────────────────────────────────────────────────────

export const stockLocations = inv.table('stock_locations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code:      varchar('code', { length: 32 }).notNull(),   // e.g. WH, VENDOR, SCRAP
  name:      varchar('name', { length: 128 }).notNull(),
  type:      stockLocationType('type').notNull().default('internal'),
  parentId:  uuid('parent_id'),                            // self-ref — handled in migration
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:     index('inv_loc_tenant_idx').on(t.tenantId),
  tenantCodeIdx: uniqueIndex('inv_loc_tenant_code_idx').on(t.tenantId, t.code),
}))

export type StockLocation = typeof stockLocations.$inferSelect
export type StockLocationType = (typeof stockLocationType.enumValues)[number]

// ── Stock Moves ───────────────────────────────────────────────────────────────

export const stockMoves = inv.table('stock_moves', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId:      uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  fromLocationId: uuid('from_location_id').notNull().references(() => stockLocations.id, { onDelete: 'restrict' }),
  toLocationId:   uuid('to_location_id').notNull().references(() => stockLocations.id, { onDelete: 'restrict' }),
  qty:            integer('qty').notNull(),               // always positive
  reference:      varchar('reference', { length: 128 }), // free-text: "ADJ-001", "INV/001", "PO/001"
  notes:          text('notes'),
  state:          stockMoveState('state').notNull().default('done'),
  movedAt:        timestamp('moved_at').notNull().defaultNow(),
  createdBy:      uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:   index('inv_move_tenant_idx').on(t.tenantId),
  productIdx:  index('inv_move_product_idx').on(t.tenantId, t.productId),
  movedAtIdx:  index('inv_move_moved_at_idx').on(t.tenantId, t.movedAt),
}))

export type StockMove = typeof stockMoves.$inferSelect
export type StockMoveState = (typeof stockMoveState.enumValues)[number]

// ── Stock Quants (on-hand per product per location) ───────────────────────────

export const stockQuants = inv.table('stock_quants', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId:  uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').notNull().references(() => stockLocations.id, { onDelete: 'cascade' }),
  qty:        integer('qty').notNull().default(0),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueIdx:  uniqueIndex('inv_quant_unique_idx').on(t.tenantId, t.productId, t.locationId),
  tenantIdx:  index('inv_quant_tenant_idx').on(t.tenantId),
}))

export type StockQuant = typeof stockQuants.$inferSelect


// ── Product Attributes ───────────────────────────────────────────────────────

export const productAttributes = inv.table('product_attributes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 64 }).notNull(),
  displayType: varchar('display_type', { length: 20 }).notNull().default('select'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:     index('inv_attr_tenant_idx').on(t.tenantId),
  tenantNameIdx: uniqueIndex('inv_attr_tenant_name_idx').on(t.tenantId, t.name),
}))

export type ProductAttribute = typeof productAttributes.$inferSelect

export const productAttributeValues = inv.table('product_attribute_values', {
  id:          uuid('id').primaryKey().defaultRandom(),
  attributeId: uuid('attribute_id').notNull().references(() => productAttributes.id, { onDelete: 'cascade' }),
  value:       varchar('value', { length: 128 }).notNull(),
  colorHex:    varchar('color_hex', { length: 7 }),
  sortOrder:   smallint('sort_order').notNull().default(0),
}, (t) => ({
  attrIdx:     index('inv_attr_val_attr_idx').on(t.attributeId),
  attrValUniq: uniqueIndex('inv_attr_val_uniq_idx').on(t.attributeId, t.value),
}))

export type ProductAttributeValue = typeof productAttributeValues.$inferSelect

// ── Product Variants ─────────────────────────────────────────────────────────

export const productVariants = inv.table('product_variants', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId:          uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku:                varchar('sku', { length: 64 }),
  barcode:            varchar('barcode', { length: 64 }),
  attributeValueIds:  uuid('attribute_value_ids').array().notNull().default([]),
  salePrice:          bigint('sale_price', { mode: 'number' }),
  costPrice:          bigint('cost_price', { mode: 'number' }),
  isActive:           boolean('is_active').notNull().default(true),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  productIdx: index('inv_var_product_idx').on(t.productId),
  tenantIdx:  index('inv_var_tenant_idx').on(t.tenantId),
}))

export type ProductVariant = typeof productVariants.$inferSelect
export type NewProductVariant = typeof productVariants.$inferInsert

export const productAttributeLines = inv.table('product_attribute_lines', {
  id:          uuid('id').primaryKey().defaultRandom(),
  productId:   uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  attributeId: uuid('attribute_id').notNull().references(() => productAttributes.id, { onDelete: 'cascade' }),
}, (t) => ({
  uniq: uniqueIndex('inv_attr_line_uniq').on(t.productId, t.attributeId),
}))

// ── UoM Conversions & Packagings ─────────────────────────────────────────────

export const productUomConversions = inv.table('product_uom_conversions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  altUomId:  uuid('alt_uom_id').notNull().references(() => uom.id, { onDelete: 'restrict' }),
  factor:    numeric('factor', { precision: 12, scale: 4 }).notNull(),
}, (t) => ({
  productIdx: index('inv_uom_conv_product_idx').on(t.productId),
  uniq:       uniqueIndex('inv_uom_conv_uniq').on(t.productId, t.altUomId),
}))

export type ProductUomConversion = typeof productUomConversions.$inferSelect

export const productPackagings = inv.table('product_packagings', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenantId:      uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId:     uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name:          varchar('name', { length: 64 }).notNull(),
  qtyPerPackage: integer('qty_per_package').notNull(),
  barcode:       varchar('barcode', { length: 64 }),
  isDefault:     boolean('is_default').notNull().default(false),
}, (t) => ({
  productIdx: index('inv_pkg_product_idx').on(t.productId),
}))

export type ProductPackaging = typeof productPackagings.$inferSelect
