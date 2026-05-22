import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'

export const omniSchema = pgSchema('omni')

export const channelType        = pgEnum('omni_channel_type',       ['email', 'web_chat', 'whatsapp', 'sms'])
export const convStatus         = pgEnum('omni_conv_status',         ['open', 'pending', 'resolved', 'snoozed'])
export const messageDirection   = pgEnum('omni_message_direction',   ['inbound', 'outbound'])
export const messageContentType = pgEnum('omni_message_content_type',['text', 'image', 'file', 'template', 'system'])

// ── Channels ──────────────────────────────────────────────────────────────────

export const omniChannels = omniSchema.table('channels', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  type:      channelType('type').notNull(),
  config:    jsonb('config').notNull().default({}),
  active:    boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('omni_channels_tenant_idx').on(t.tenantId),
}))

export type OmniChannel = typeof omniChannels.$inferSelect
export type OmniChannelType = typeof channelType.enumValues[number]

export type WebChatConfig = { widgetColor: string; greeting: string; widgetToken: string }
export type EmailChannelConfig = { emailAccountId: string }
export type WhatsAppConfig = { phoneNumberId: string; accessToken: string; verifyToken: string }
export type SmsConfig = { fromNumber: string; accountSid: string; authToken: string }

// ── Conversations ─────────────────────────────────────────────────────────────

export const omniConversations = omniSchema.table('conversations', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channelId:          uuid('channel_id').notNull().references(() => omniChannels.id, { onDelete: 'cascade' }),
  contactId:          uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  contactName:        text('contact_name'),
  contactIdentifier:  text('contact_identifier'),
  subject:            text('subject'),
  status:             convStatus('status').notNull().default('open'),
  assignedTo:         uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  lastMessageAt:      timestamp('last_message_at', { withTimezone: true }),
  unreadCount:        integer('unread_count').notNull().default(0),
  messageCount:       integer('message_count').notNull().default(0),
  externalRef:        text('external_ref'),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx:   index('omni_conv_tenant_idx').on(t.tenantId, t.status, t.lastMessageAt),
  channelIdx:  index('omni_conv_channel_idx').on(t.channelId, t.status),
  extRefUniq:  unique('omni_conv_ext_ref_unique').on(t.channelId, t.externalRef),
}))

export type OmniConversation = typeof omniConversations.$inferSelect
export type OmniConvStatus = typeof convStatus.enumValues[number]

// ── Messages ──────────────────────────────────────────────────────────────────

export const omniMessages = omniSchema.table('messages', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  convId:      uuid('conv_id').notNull().references(() => omniConversations.id, { onDelete: 'cascade' }),
  direction:   messageDirection('direction').notNull(),
  contentType: messageContentType('content_type').notNull().default('text'),
  body:        text('body'),
  fromName:    text('from_name'),
  authorId:    uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  metadata:    jsonb('metadata').notNull().default({}),
  sentAt:      timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  read:        boolean('read').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  convIdx:   index('omni_messages_conv_idx').on(t.convId, t.sentAt),
  tenantIdx: index('omni_messages_tenant_idx').on(t.tenantId),
}))

export type OmniMessage = typeof omniMessages.$inferSelect

// ── Widget sessions ───────────────────────────────────────────────────────────

export const omniWidgetSessions = omniSchema.table('widget_sessions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channelId:    uuid('channel_id').notNull().references(() => omniChannels.id, { onDelete: 'cascade' }),
  convId:       uuid('conv_id').references(() => omniConversations.id, { onDelete: 'set null' }),
  visitorName:  text('visitor_name'),
  visitorEmail: text('visitor_email'),
  userAgent:    text('user_agent'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt:   timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  channelIdx: index('omni_widget_sessions_channel_idx').on(t.channelId),
}))

export type OmniWidgetSession = typeof omniWidgetSessions.$inferSelect
