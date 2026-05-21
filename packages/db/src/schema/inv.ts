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
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
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
