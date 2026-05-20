import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  bigint,
  jsonb,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * IS-RENT — Rental & Property Management (Phase 1, vertical-flexible).
 *
 * Single schema serves equipment rental, vehicle rental, AND property
 * management (PMS) — verticals differentiate via `category` enum and
 * per-asset `metadata` jsonb. PMS use case: category = 'property' or
 * 'room', rate_unit = 'month', metadata stores bedrooms/area/amenities.
 *
 * Amounts in IDR — bigint, smallest unit is Rp 1 (no fractional).
 */
export const rent = pgSchema('rent')

export const assetCategory = pgEnum('rent_asset_category', [
  'equipment',
  'vehicle',
  'property',
  'room',
  'venue',
  'other',
])

export const assetStatus = pgEnum('rent_asset_status', [
  'available',
  'reserved',
  'rented',
  'maintenance',
  'retired',
])

export const customerType = pgEnum('rent_customer_type', ['individual', 'business'])

export const reservationStatus = pgEnum('rent_reservation_status', [
  'draft',
  'confirmed',
  'active',
  'completed',
  'cancelled',
])

export const rateUnit = pgEnum('rent_rate_unit', ['hour', 'day', 'week', 'month'])

// ── Assets ────────────────────────────────────────────────────────────────────
export const assets = rent.table(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    assetCode: varchar('asset_code', { length: 50 }),
    name: varchar('name', { length: 255 }).notNull(),
    category: assetCategory('category').notNull().default('equipment'),
    status: assetStatus('status').notNull().default('available'),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    // Pricing in IDR — null when not offered at that tier
    hourlyRate: bigint('hourly_rate', { mode: 'number' }),
    dailyRate: bigint('daily_rate', { mode: 'number' }),
    weeklyRate: bigint('weekly_rate', { mode: 'number' }),
    monthlyRate: bigint('monthly_rate', { mode: 'number' }),
    depositAmount: bigint('deposit_amount', { mode: 'number' }),
    // Vertical-specific fields: { plate_number, bedrooms, area_sqm, amenities, ... }
    metadata: jsonb('metadata').notNull().default({}),
    photos: jsonb('photos').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('asset_tenant_idx').on(t.tenantId),
    catIdx: index('asset_cat_idx').on(t.tenantId, t.category),
    statusIdx: index('asset_status_idx').on(t.tenantId, t.status),
  }),
)

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type AssetCategory = (typeof assetCategory.enumValues)[number]
export type AssetStatus = (typeof assetStatus.enumValues)[number]

// ── Customers ─────────────────────────────────────────────────────────────────
export const rentCustomers = rent.table(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** FK to platform.contacts (Phase 32). Nullable for back-compat. */
    contactId: uuid('contact_id'),
    name: varchar('name', { length: 255 }).notNull(),
    customerType: customerType('customer_type').notNull().default('individual'),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 30 }),
    address: text('address'),
    idNumber: varchar('id_number', { length: 25 }), // NIK (individual) or NPWP (business)
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('rcust_tenant_idx').on(t.tenantId),
  }),
)

export type RentCustomer = typeof rentCustomers.$inferSelect
export type NewRentCustomer = typeof rentCustomers.$inferInsert
export type CustomerType = (typeof customerType.enumValues)[number]

// ── Reservations / Bookings / Leases ──────────────────────────────────────────
export const reservations = rent.table(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => rentCustomers.id, { onDelete: 'restrict' }),
    status: reservationStatus('status').notNull().default('draft'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    actualStartAt: timestamp('actual_start_at', { withTimezone: true }),
    actualEndAt: timestamp('actual_end_at', { withTimezone: true }),
    rateAmount: bigint('rate_amount', { mode: 'number' }).notNull().default(0),
    rateUnit: rateUnit('rate_unit').notNull().default('day'),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
    depositAmount: bigint('deposit_amount', { mode: 'number' }).notNull().default(0),
    depositReturned: boolean('deposit_returned').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('resv_tenant_idx').on(t.tenantId),
    assetIdx: index('resv_asset_idx').on(t.assetId, t.startAt),
    statusIdx: index('resv_status_idx').on(t.tenantId, t.status),
  }),
)

export type Reservation = typeof reservations.$inferSelect
export type NewReservation = typeof reservations.$inferInsert
export type ReservationStatus = (typeof reservationStatus.enumValues)[number]
export type RateUnit = (typeof rateUnit.enumValues)[number]
