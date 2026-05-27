import {
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'

/**
 * contact type: company (legal entity) or individual (person).
 * Migration 0047 renamed old PG enum values: person→individual, organization→company.
 */
export const contactType = pgEnum('platform_contact_type', ['company', 'individual'])

/**
 * address_type classifies an Individual contact relative to its parent Company.
 * NULL on Company contacts.
 */
export const contactAddressType = pgEnum('platform_contact_address_type', [
  'main', 'invoice', 'delivery', 'contact', 'other',
])

export const contactRole = pgEnum('platform_contact_role', [
  'staff', 'customer', 'vendor', 'lead', 'other',
])

export const contacts = platform.table(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: contactType('type').notNull().default('individual'),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 254 }),
    phone: varchar('phone', { length: 32 }),
    npwp: varchar('npwp', { length: 25 }),
    address: text('address'),
    notes: text('notes'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Hierarchy (migration 0047)
    /** NULL for Company contacts; references a 'company' contact for Individuals. */
    parentId: uuid('parent_id'),
    /** Classification for Individual contacts. NULL on Company contacts. */
    addressType: contactAddressType('address_type'),

    // Extended fields (migration 0046)
    isPkp:         boolean('is_pkp').notNull().default(false),
    website:       varchar('website', { length: 500 }),
    language:      varchar('language', { length: 10 }),
    /** ISO 3166-1 alpha-2 country code. */
    country:       varchar('country', { length: 2 }),
    /** Structured Indonesian address fields — populated only when country = 'ID'. */
    addrLine1:     text('addr_line1'),
    addrLine2:     text('addr_line2'),
    addrRt:        varchar('addr_rt', { length: 10 }),
    addrRw:        varchar('addr_rw', { length: 10 }),
    addrKelurahan: varchar('addr_kelurahan', { length: 100 }),
    addrKecamatan: varchar('addr_kecamatan', { length: 100 }),
    addrKota:      varchar('addr_kota', { length: 100 }),
    addrProvinsi:  varchar('addr_provinsi', { length: 100 }),
    addrKodePos:   varchar('addr_kode_pos', { length: 10 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantEmailUnique: uniqueIndex('contacts_tenant_email_unique').on(t.tenantId, t.email),
    tenantUserUnique: uniqueIndex('contacts_tenant_user_unique').on(t.tenantId, t.userId),
    tenantIdx: index('contacts_tenant_id_idx').on(t.tenantId),
    nameIdx: index('contacts_name_idx').on(t.tenantId, t.name),
    parentIdx: index('contacts_parent_id_idx').on(t.parentId),
  }),
)

export const contactRoles = platform.table(
  'contact_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: contactRole('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    contactRoleUnique: uniqueIndex('contact_roles_contact_role_unique').on(t.contactId, t.role),
    tenantIdx: index('contact_roles_tenant_id_idx').on(t.tenantId),
  }),
)

/** Bank accounts attached to a contact (1:N). */
export const contactBankAccounts = platform.table(
  'contact_bank_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    accountNumber: text('account_number').notNull(),
    bankName: varchar('bank_name', { length: 200 }),
    branch: varchar('branch', { length: 200 }),
    routingNumber: varchar('routing_number', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    contactIdx: index('cba_contact_idx').on(t.contactId),
    tenantIdx: index('cba_tenant_idx').on(t.tenantId),
  }),
)

/**
 * Financial profile per contact (1:1).
 * FKs to payment_terms / pricelists / chart_of_accounts are plain UUIDs —
 * referential constraints added when those tables ship in finance migrations.
 * Inheritance: if an Individual's field is NULL, callers fall back to the parent
 * Company's profile (computed in lib/contacts.ts getContactWithInheritance).
 */
export const contactFinancialProfiles = platform.table(
  'contact_financial_profiles',
  {
    contactId: uuid('contact_id').primaryKey().references(() => contacts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    // Sales
    salespersonId: uuid('salesperson_id').references(() => users.id, { onDelete: 'set null' }),
    paymentTermsId: uuid('payment_terms_id'),
    paymentTermsLabel: varchar('payment_terms_label', { length: 200 }),
    pricelistId: uuid('pricelist_id'),
    pricelistLabel: varchar('pricelist_label', { length: 200 }),
    deliveryMethod: text('delivery_method'),
    // Purchase
    buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'set null' }),
    purchasePaymentTermsId: uuid('purchase_payment_terms_id'),
    purchasePaymentTermsLabel: varchar('purchase_payment_terms_label', { length: 200 }),
    purchasePaymentMethod: text('purchase_payment_method'),
    receiptReminder: boolean('receipt_reminder').notNull().default(false),
    supplierCurrency: varchar('supplier_currency', { length: 3 }),
    // Accounting defaults
    propertyAccountReceivableId: uuid('property_account_receivable_id'),
    propertyAccountReceivableLabel: varchar('property_account_receivable_label', { length: 200 }),
    propertyAccountPayableId: uuid('property_account_payable_id'),
    propertyAccountPayableLabel: varchar('property_account_payable_label', { length: 200 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('cfp_tenant_idx').on(t.tenantId),
  }),
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type ContactType = (typeof contactType.enumValues)[number]
export type ContactAddressType = (typeof contactAddressType.enumValues)[number]
export type ContactRole = (typeof contactRole.enumValues)[number]
export type ContactBankAccount = typeof contactBankAccounts.$inferSelect
export type NewContactBankAccount = typeof contactBankAccounts.$inferInsert
export type ContactFinancialProfile = typeof contactFinancialProfiles.$inferSelect
export type NewContactFinancialProfile = typeof contactFinancialProfiles.$inferInsert
