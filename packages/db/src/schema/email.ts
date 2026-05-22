import {
  pgSchema,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'

export const emailSchema = pgSchema('email')

export const emailThreadStatus = pgEnum('email_thread_status', ['open', 'snoozed', 'closed'])
export const emailMessageDirection = pgEnum('email_message_direction', ['inbound', 'outbound'])

// ── Accounts (shared inboxes) ─────────────────────────────────────────────────

export const emailAccounts = emailSchema.table('accounts', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  label:          text('label').notNull(),
  address:        text('address').notNull(),
  imapHost:       text('imap_host').notNull(),
  imapPort:       integer('imap_port').notNull().default(993),
  imapSecure:     boolean('imap_secure').notNull().default(true),
  imapUser:       text('imap_user').notNull(),
  imapPassword:   text('imap_password').notNull(),
  smtpHost:       text('smtp_host').notNull(),
  smtpPort:       integer('smtp_port').notNull().default(465),
  smtpSecure:     boolean('smtp_secure').notNull().default(true),
  smtpUser:       text('smtp_user').notNull(),
  smtpPassword:   text('smtp_password').notNull(),
  active:         boolean('active').notNull().default(true),
  lastSyncAt:     timestamp('last_sync_at', { withTimezone: true }),
  lastSyncError:  text('last_sync_error'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  addressUniq: unique('email_accounts_address_unique').on(t.tenantId, t.address),
  tenantIdx:   index('email_accounts_tenant_idx').on(t.tenantId),
}))

export type EmailAccount = typeof emailAccounts.$inferSelect

// ── Threads ───────────────────────────────────────────────────────────────────

export const emailThreads = emailSchema.table('threads', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  accountId:      uuid('account_id').notNull().references(() => emailAccounts.id, { onDelete: 'cascade' }),
  subject:        text('subject'),
  status:         emailThreadStatus('status').notNull().default('open'),
  assignedTo:     uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  lastMessageAt:  timestamp('last_message_at', { withTimezone: true }),
  contactId:      uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  unreadCount:    integer('unread_count').notNull().default(0),
  messageCount:   integer('message_count').notNull().default(0),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  accountIdx:  index('email_threads_account_idx').on(t.accountId, t.status, t.lastMessageAt),
  tenantIdx:   index('email_threads_tenant_idx').on(t.tenantId),
}))

export type EmailThread = typeof emailThreads.$inferSelect

// ── Messages ──────────────────────────────────────────────────────────────────

export const emailMessages = emailSchema.table('messages', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  accountId:    uuid('account_id').notNull().references(() => emailAccounts.id, { onDelete: 'cascade' }),
  threadId:     uuid('thread_id').notNull().references(() => emailThreads.id, { onDelete: 'cascade' }),
  messageId:    text('message_id'),
  inReplyTo:    text('in_reply_to'),
  refs:         text('refs'),
  direction:    emailMessageDirection('direction').notNull(),
  fromAddr:     text('from_addr').notNull(),
  fromName:     text('from_name'),
  toAddrs:      text('to_addrs').array().notNull().default([] as unknown as string[]),
  ccAddrs:      text('cc_addrs').array().notNull().default([] as unknown as string[]),
  subject:      text('subject'),
  bodyText:     text('body_text'),
  bodyHtml:     text('body_html'),
  snippet:      text('snippet'),
  sentAt:       timestamp('sent_at', { withTimezone: true }).notNull(),
  imapUid:      bigint('imap_uid', { mode: 'number' }),
  read:         boolean('read').notNull().default(false),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  msgIdUniq:   unique('email_messages_msgid_unique').on(t.accountId, t.messageId),
  threadIdx:   index('email_messages_thread_idx').on(t.threadId, t.sentAt),
  tenantIdx:   index('email_messages_tenant_idx').on(t.tenantId),
}))

export type EmailMessage = typeof emailMessages.$inferSelect

// ── Attachments ───────────────────────────────────────────────────────────────

export const emailAttachments = emailSchema.table('attachments', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  messageId:    uuid('message_id').notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
  filename:     text('filename').notNull(),
  contentType:  text('content_type'),
  sizeBytes:    integer('size_bytes'),
  storageKey:   text('storage_key'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  messageIdx: index('email_attachments_message_idx').on(t.messageId),
}))

export type EmailAttachment = typeof emailAttachments.$inferSelect
