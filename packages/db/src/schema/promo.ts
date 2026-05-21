import {
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
  index,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const promoSchema = pgSchema('promo')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const discountType = pgEnum('discount_type', [
  'fixed_amount',
  'percentage',
  'tiered',
  'bogo',
  'bundle',
])

export const promoStatus = pgEnum('promo_status', ['active', 'inactive', 'archived'])

export const voucherType = pgEnum('voucher_type', ['code', 'gift_card'])

// ── Promotions ─────────────────────────────────────────────────────────────────

export const promotions = promoSchema.table('promotions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  description:    text('description'),
  discountType:   discountType('discount_type').notNull().default('percentage'),
  discountConfig: jsonb('discount_config').notNull().default({}),
  conditions:     jsonb('conditions').notNull().default({}),
  customFormula:  text('custom_formula'),
  status:         promoStatus('status').notNull().default('inactive'),
  validFrom:      date('valid_from'),
  validTo:        date('valid_to'),
  priority:       integer('priority').notNull().default(0),
  createdBy:      uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:       index('promo_promotions_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('promo_promotions_tenant_status').on(t.tenantId, t.status),
}))

export type Promotion = typeof promotions.$inferSelect
export type NewPromotion = typeof promotions.$inferInsert
export type DiscountType = (typeof discountType.enumValues)[number]
export type PromoStatus = (typeof promoStatus.enumValues)[number]

// ── Vouchers & Gift Cards ──────────────────────────────────────────────────────

export const vouchers = promoSchema.table('vouchers', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  tenantId:             uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  promotionId:          uuid('promotion_id'),
  voucherType:          voucherType('voucher_type').notNull().default('code'),
  code:                 text('code').notNull(),
  initialBalance:       integer('initial_balance'),
  balance:              integer('balance'),
  discountOverridePct:  integer('discount_override_pct'),
  discountOverrideAmt:  integer('discount_override_amt'),
  contactId:            uuid('contact_id'),
  maxUses:              integer('max_uses'),
  usageCount:           integer('usage_count').notNull().default(0),
  validFrom:            date('valid_from'),
  validTo:              date('valid_to'),
  notes:                text('notes'),
  createdBy:            uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantCodeUniq: unique('promo_vouchers_tenant_code_uniq').on(t.tenantId, t.code),
  tenantIdx:      index('promo_vouchers_tenant_idx').on(t.tenantId),
  codeIdx:        index('promo_vouchers_code_idx').on(t.tenantId, t.code),
  contactIdx:     index('promo_vouchers_contact_idx').on(t.tenantId, t.contactId),
}))

export type Voucher = typeof vouchers.$inferSelect
export type NewVoucher = typeof vouchers.$inferInsert
export type VoucherType = (typeof voucherType.enumValues)[number]

// ── Promotion Use Audit ────────────────────────────────────────────────────────

export const promotionUses = promoSchema.table('promotion_uses', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  promotionId:  uuid('promotion_id'),
  voucherId:    uuid('voucher_id'),
  soId:         uuid('so_id'),
  contactId:    uuid('contact_id'),
  discountGiven: integer('discount_given').notNull(),
  appliedAt:    timestamp('applied_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:    index('promo_uses_tenant_idx').on(t.tenantId),
  promotionIdx: index('promo_uses_promotion_idx').on(t.promotionId),
  soIdx:        index('promo_uses_so_idx').on(t.soId),
}))

export type PromotionUse = typeof promotionUses.$inferSelect
