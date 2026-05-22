import 'server-only'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  omniChannels, omniConversations, omniMessages, omniWidgetSessions,
  contacts,
} from '@kantorcore/db'
import type {
  OmniChannel, OmniConversation, OmniMessage, OmniWidgetSession,
  OmniChannelType, OmniConvStatus, WebChatConfig, EmailChannelConfig,
} from '@kantorcore/db'
import { withTenant } from './db'
import { encryptSecret, decryptSecret } from './crypto'

export type {
  OmniChannel, OmniConversation, OmniMessage, OmniWidgetSession,
  OmniChannelType, OmniConvStatus, WebChatConfig, EmailChannelConfig,
}

// ── Channels ──────────────────────────────────────────────────────────────────

export type ChannelInput = {
  name: string
  type: OmniChannelType
  config: Record<string, string>
}

/** Encrypts sensitive keys in channel config before storage. */
function encryptConfig(type: OmniChannelType, raw: Record<string, string>): Record<string, string> {
  const sensitive: Record<OmniChannelType, string[]> = {
    email:     [],
    web_chat:  [],
    whatsapp:  ['accessToken'],
    sms:       ['authToken'],
  }
  const keys = sensitive[type] ?? []
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, keys.includes(k) ? encryptSecret(v) : v]),
  )
}

function decryptConfig(type: OmniChannelType, stored: Record<string, string>): Record<string, string> {
  const sensitive: Record<OmniChannelType, string[]> = {
    email:     [],
    web_chat:  [],
    whatsapp:  ['accessToken'],
    sms:       ['authToken'],
  }
  const keys = sensitive[type] ?? []
  return Object.fromEntries(
    Object.entries(stored).map(([k, v]) => {
      if (!keys.includes(k)) return [k, v]
      try { return [k, decryptSecret(v)] } catch { return [k, ''] }
    }),
  )
}

export async function listChannels(tenantId: string): Promise<OmniChannel[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(omniChannels)
      .where(eq(omniChannels.tenantId, tenantId))
      .orderBy(asc(omniChannels.createdAt)),
  )
}

export async function createChannel(tenantId: string, input: ChannelInput): Promise<OmniChannel> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(omniChannels).values({
      tenantId,
      name: input.name,
      type: input.type,
      config: encryptConfig(input.type, input.config),
    }).returning(),
  )
  return row
}

export async function getChannel(tenantId: string, channelId: string): Promise<OmniChannel | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(omniChannels)
      .where(and(eq(omniChannels.tenantId, tenantId), eq(omniChannels.id, channelId)))
      .limit(1),
  )
  return rows[0] ?? null
}

export async function getChannelDecrypted(tenantId: string, channelId: string): Promise<OmniChannel | null> {
  const ch = await getChannel(tenantId, channelId)
  if (!ch) return null
  return { ...ch, config: decryptConfig(ch.type, ch.config as Record<string, string>) }
}

export async function deleteChannel(tenantId: string, channelId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.delete(omniChannels)
      .where(and(eq(omniChannels.tenantId, tenantId), eq(omniChannels.id, channelId))),
  )
}

/** Generate a stable widget token from channel id (first 24 hex chars). */
export function widgetToken(channelId: string): string {
  return channelId.replace(/-/g, '').slice(0, 24)
}

/** Resolve channel from a widget token. */
export async function getChannelByToken(tenantId: string, token: string): Promise<OmniChannel | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(omniChannels)
      .where(and(
        eq(omniChannels.tenantId, tenantId),
        eq(omniChannels.type, 'web_chat'),
        eq(omniChannels.active, true),
      )),
  )
  return rows.find((c) => widgetToken(c.id) === token) ?? null
}

// ── Conversations ─────────────────────────────────────────────────────────────

export type ConvListItem = OmniConversation & {
  channelName: string
  channelType: OmniChannelType
  lastBody: string | null
}

export async function listConversations(
  tenantId: string,
  opts: { channelId?: string; status?: OmniConvStatus; assignedTo?: string; limit?: number } = {},
): Promise<ConvListItem[]> {
  return withTenant(tenantId, async (tx) => {
    const wheres = [eq(omniConversations.tenantId, tenantId)]
    if (opts.channelId) wheres.push(eq(omniConversations.channelId, opts.channelId))
    if (opts.status) wheres.push(eq(omniConversations.status, opts.status))
    if (opts.assignedTo) wheres.push(eq(omniConversations.assignedTo, opts.assignedTo))

    const rows = await tx
      .select({ conv: omniConversations, channelName: omniChannels.name, channelType: omniChannels.type })
      .from(omniConversations)
      .innerJoin(omniChannels, eq(omniChannels.id, omniConversations.channelId))
      .where(and(...wheres))
      .orderBy(desc(omniConversations.lastMessageAt))
      .limit(opts.limit ?? 100)

    if (rows.length === 0) return []

    // Fetch last message snippet per conversation
    const convIds = rows.map((r) => r.conv.id)
    const latestMsgs = await tx
      .select({ convId: omniMessages.convId, body: omniMessages.body, sentAt: omniMessages.sentAt })
      .from(omniMessages)
      .where(sql`${omniMessages.convId} = ANY(${convIds})`)
      .orderBy(desc(omniMessages.sentAt))
    const lastBody = new Map<string, string | null>()
    for (const m of latestMsgs) {
      if (!lastBody.has(m.convId)) lastBody.set(m.convId, m.body)
    }

    return rows.map((r) => ({
      ...r.conv,
      channelName: r.channelName,
      channelType: r.channelType,
      lastBody: lastBody.get(r.conv.id) ?? null,
    }))
  })
}

export async function getConversation(
  tenantId: string,
  convId: string,
): Promise<{ conv: OmniConversation; messages: OmniMessage[]; channel: OmniChannel } | null> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({ conv: omniConversations, channel: omniChannels })
      .from(omniConversations)
      .innerJoin(omniChannels, eq(omniChannels.id, omniConversations.channelId))
      .where(and(eq(omniConversations.tenantId, tenantId), eq(omniConversations.id, convId)))
      .limit(1)
    if (!row) return null

    const messages = await tx
      .select()
      .from(omniMessages)
      .where(eq(omniMessages.convId, convId))
      .orderBy(asc(omniMessages.sentAt))

    return { conv: row.conv, channel: row.channel, messages }
  })
}

export async function updateConversation(
  tenantId: string,
  convId: string,
  patch: { status?: OmniConvStatus; assignedTo?: string | null },
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.update(omniConversations)
      .set(patch)
      .where(and(eq(omniConversations.tenantId, tenantId), eq(omniConversations.id, convId))),
  )
}

export async function markConversationRead(tenantId: string, convId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx.update(omniMessages).set({ read: true }).where(eq(omniMessages.convId, convId))
    await tx.update(omniConversations)
      .set({ unreadCount: 0 })
      .where(and(eq(omniConversations.tenantId, tenantId), eq(omniConversations.id, convId)))
  })
}

// ── Message ingestion (used by all channels) ──────────────────────────────────

export type IngestMessageInput = {
  channelId: string
  direction: 'inbound' | 'outbound'
  contentType?: 'text' | 'image' | 'file' | 'template' | 'system'
  body: string | null
  fromName?: string | null
  authorId?: string | null
  metadata?: Record<string, unknown>
  sentAt?: Date
  /** If set, find/create the conversation by this external ref. */
  externalRef?: string | null
  contactName?: string | null
  contactIdentifier?: string | null
  subject?: string | null
}

export async function ingestMessage(
  tenantId: string,
  input: IngestMessageInput,
): Promise<{ message: OmniMessage; convId: string; isNew: boolean }> {
  return withTenant(tenantId, async (tx) => {
    // Find or create conversation
    let convId: string
    let isNew = false

    if (input.externalRef) {
      const existing = await tx
        .select({ id: omniConversations.id })
        .from(omniConversations)
        .where(and(
          eq(omniConversations.channelId, input.channelId),
          eq(omniConversations.externalRef, input.externalRef),
        ))
        .limit(1)

      if (existing[0]) {
        convId = existing[0].id
      } else {
        // Try to link contact by identifier
        let contactId: string | null = null
        if (input.contactIdentifier) {
          const contactRows = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(
              eq(contacts.tenantId, tenantId),
              eq(contacts.email, input.contactIdentifier.toLowerCase()),
            ))
            .limit(1)
          contactId = contactRows[0]?.id ?? null
        }

        const [newConv] = await tx.insert(omniConversations).values({
          tenantId,
          channelId: input.channelId,
          externalRef: input.externalRef,
          contactId,
          contactName: input.contactName ?? null,
          contactIdentifier: input.contactIdentifier ?? null,
          subject: input.subject ?? null,
          lastMessageAt: input.sentAt ?? new Date(),
          unreadCount: input.direction === 'inbound' ? 1 : 0,
        }).returning()
        convId = newConv.id
        isNew = true
      }
    } else {
      throw new Error('externalRef diperlukan untuk membuat percakapan baru.')
    }

    const [message] = await tx.insert(omniMessages).values({
      tenantId,
      convId,
      direction: input.direction,
      contentType: input.contentType ?? 'text',
      body: input.body,
      fromName: input.fromName ?? null,
      authorId: input.authorId ?? null,
      metadata: (input.metadata ?? {}) as Record<string, unknown>,
      sentAt: input.sentAt ?? new Date(),
    }).returning()

    // Bump counters
    await tx.update(omniConversations)
      .set({
        lastMessageAt: message.sentAt,
        messageCount: sql`${omniConversations.messageCount} + 1`,
        unreadCount: input.direction === 'inbound'
          ? sql`${omniConversations.unreadCount} + 1`
          : omniConversations.unreadCount,
      })
      .where(eq(omniConversations.id, convId))

    return { message, convId, isNew }
  })
}

// ── Widget sessions ───────────────────────────────────────────────────────────

export async function createWidgetSession(
  tenantId: string,
  channelId: string,
  opts: { visitorName?: string; visitorEmail?: string; userAgent?: string } = {},
): Promise<OmniWidgetSession> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(omniWidgetSessions).values({
      tenantId, channelId,
      visitorName: opts.visitorName ?? null,
      visitorEmail: opts.visitorEmail ?? null,
      userAgent: opts.userAgent ?? null,
    }).returning(),
  )
  return row
}

export async function getWidgetSession(tenantId: string, sessionId: string): Promise<OmniWidgetSession | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(omniWidgetSessions)
      .where(and(eq(omniWidgetSessions.tenantId, tenantId), eq(omniWidgetSessions.id, sessionId)))
      .limit(1),
  )
  return rows[0] ?? null
}

export async function touchWidgetSession(tenantId: string, sessionId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.update(omniWidgetSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(omniWidgetSessions.id, sessionId)),
  )
}

export async function linkSessionToConv(tenantId: string, sessionId: string, convId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.update(omniWidgetSessions)
      .set({ convId })
      .where(and(eq(omniWidgetSessions.tenantId, tenantId), eq(omniWidgetSessions.id, sessionId))),
  )
}
