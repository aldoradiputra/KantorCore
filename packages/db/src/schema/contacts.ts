import {
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'

/**
 * The single golden record for any "person or organization" the workspace
 * interacts with — internal staff, customers, vendors, external consultants.
 *
 * Per ADR-008 (forthcoming): `contacts` is the root identity within a tenant.
 *   - email is unique per tenant (one email → one contact)
 *   - a contact MAY have a linked user account (userId) — internal staff
 *   - a contact MAY have a linked employee record (hr.employees.contactId)
 *   - invoices.contactId, bills.contactId, rent.customers.contactId FK here
 *
 * Why not Odoo-style res.partner (one mega-table)? We keep `contacts` lean —
 * org-only fields, not employment/billing extras — and let each module add
 * its own row keyed by contactId. Looser coupling, fewer NULLable columns.
 */
export const contactType = pgEnum('platform_contact_type', ['person', 'organization'])

/**
 * Optional role flags per tenant — a single contact can be tagged as multiple
 * roles (customer + vendor is common: e.g. a partner you both buy from and
 * sell to).
 */
export const contactRole = pgEnum('platform_contact_role', [
  'staff',
  'customer',
  'vendor',
  'lead',
  'other',
])

export const contacts = platform.table(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: contactType('type').notNull().default('person'),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 254 }),
    phone: varchar('phone', { length: 32 }),
    /** NPWP — Indonesian tax ID. 15 digits formatted (e.g. 12.345.678.9-012.000). */
    npwp: varchar('npwp', { length: 25 }),
    address: text('address'),
    notes: text('notes'),
    /** Link to login account when the contact is an internal user. NULL otherwise. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    /** Portal access enabled — when true, contact can sign into the external portal via magic link. */
    portalEnabled: boolean('portal_enabled').notNull().default(false),
    portalLastLogin: timestamp('portal_last_login', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Email is unique per tenant; multiple tenants can have the same email. */
    tenantEmailUnique: uniqueIndex('contacts_tenant_email_unique').on(t.tenantId, t.email),
    /** A user can be linked to only one contact per tenant. */
    tenantUserUnique: uniqueIndex('contacts_tenant_user_unique').on(t.tenantId, t.userId),
    tenantIdx: index('contacts_tenant_id_idx').on(t.tenantId),
    nameIdx: index('contacts_name_idx').on(t.tenantId, t.name),
  }),
)

/**
 * Many-to-many tagging — a contact can be both a customer and a vendor.
 * Replacing this with a boolean isCustomer/isVendor would force three or four
 * NULLable columns; the M:N table stays open-ended.
 */
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

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type ContactType = (typeof contactType.enumValues)[number]
export type ContactRole = (typeof contactRole.enumValues)[number]
