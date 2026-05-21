import {
  pgSchema,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { contacts } from './contacts'

export const portalSchema = pgSchema('portal')

export const portalMagicLinks = portalSchema.table('magic_links', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contactId:  uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  tokenHash:  text('token_hash').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tokenUniq:    unique('portal_magic_links_token_uniq').on(t.tokenHash),
  contactIdx:   index('portal_magic_links_contact').on(t.contactId),
}))

export type PortalMagicLink = typeof portalMagicLinks.$inferSelect

export const portalSessions = portalSchema.table('sessions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contactId:  uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  tokenHash:  text('token_hash').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  userAgent:  text('user_agent'),
  ipAddress:  text('ip_address'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tokenUniq:    unique('portal_sessions_token_uniq').on(t.tokenHash),
  contactIdx:   index('portal_sessions_contact').on(t.contactId),
}))

export type PortalSession = typeof portalSessions.$inferSelect
