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

export const contactType = pgEnum('platform_contact_type', ['person', 'organization'])

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
    npwp: varchar('npwp', { length: 25 }),
    address: text('address'),
    notes: text('notes'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Extended fields (migration 0046)
    isPkp:        boolean('is_pkp').notNull().default(false),
    website:      varchar('website', { length: 500 }),
    language:     varchar('language', { length: 10 }),
    /** ISO 3166-1 alpha-2 country code. */
    country:      varchar('country', { length: 2 }),
    /** Structured Indonesian address fields — populated only when country = 'ID'. */
    addrLine1:    text('addr_line1'),
    addrLine2:    text('addr_line2'),
    addrRt:       varchar('addr_rt', { length: 10 }),
    addrRw:       varchar('addr_rw', { length: 10 }),
    addrKelurahan: varchar('addr_kelurahan', { length: 100 }),
    addrKecamatan: varchar('addr_kecamatan', { length: 100 }),
    addrKota:     varchar('addr_kota', { length: 100 }),
    addrProvinsi: varchar('addr_provinsi', { length: 100 }),
    addrKodePos:  varchar('addr_kode_pos', { length: 10 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantEmailUnique: uniqueIndex('contacts_tenant_email_unique').on(t.tenantId, t.email),
    tenantUserUnique: uniqueIndex('contacts_tenant_user_unique').on(t.tenantId, t.userId),
    tenantIdx: index('contacts_tenant_id_idx').on(t.tenantId),
    nameIdx: index('contacts_name_idx').on(t.tenantId, t.name),
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

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type ContactType = (typeof contactType.enumValues)[number]
export type ContactRole = (typeof contactRole.enumValues)[number]
