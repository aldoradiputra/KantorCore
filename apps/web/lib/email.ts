import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  emailAccounts,
  emailThreads,
  emailMessages,
  emailAttachments,
  contacts,
} from '@kantorcore/db'
import type { EmailAccount, EmailThread, EmailMessage, EmailAttachment } from '@kantorcore/db'
import { withTenant } from './db'
import { encryptSecret, decryptSecret } from './crypto'

export type { EmailAccount, EmailThread, EmailMessage, EmailAttachment }

// ── Accounts ──────────────────────────────────────────────────────────────────

export type NewAccountInput = {
  label: string
  address: string
  imapHost: string
  imapPort?: number
  imapSecure?: boolean
  imapUser: string
  imapPassword: string
  smtpHost: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser: string
  smtpPassword: string
}

export type AccountSafe = Omit<EmailAccount, 'imapPassword' | 'smtpPassword'>

function stripSecrets(a: EmailAccount): AccountSafe {
  const { imapPassword: _ip, smtpPassword: _sp, ...rest } = a
  return rest
}

export async function listAccounts(tenantId: string): Promise<AccountSafe[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(emailAccounts)
      .where(eq(emailAccounts.tenantId, tenantId))
      .orderBy(asc(emailAccounts.label)),
  )
  return rows.map(stripSecrets)
}

export async function getAccount(tenantId: string, accountId: string): Promise<AccountSafe | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(emailAccounts)
      .where(and(eq(emailAccounts.tenantId, tenantId), eq(emailAccounts.id, accountId)))
      .limit(1),
  )
  return rows[0] ? stripSecrets(rows[0]) : null
}

export async function getAccountWithCreds(tenantId: string, accountId: string): Promise<EmailAccount | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(emailAccounts)
      .where(and(eq(emailAccounts.tenantId, tenantId), eq(emailAccounts.id, accountId)))
      .limit(1),
  )
  if (!rows[0]) return null
  const r = rows[0]
  return {
    ...r,
    imapPassword: decryptSecret(r.imapPassword),
    smtpPassword: decryptSecret(r.smtpPassword),
  }
}

export async function createAccount(tenantId: string, input: NewAccountInput): Promise<AccountSafe> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(emailAccounts).values({
      tenantId,
      label: input.label,
      address: input.address.toLowerCase(),
      imapHost: input.imapHost,
      imapPort: input.imapPort ?? 993,
      imapSecure: input.imapSecure ?? true,
      imapUser: input.imapUser,
      imapPassword: encryptSecret(input.imapPassword),
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort ?? 465,
      smtpSecure: input.smtpSecure ?? true,
      smtpUser: input.smtpUser,
      smtpPassword: encryptSecret(input.smtpPassword),
    }).returning(),
  )
  return stripSecrets(row)
}

export async function deleteAccount(tenantId: string, accountId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.delete(emailAccounts)
      .where(and(eq(emailAccounts.tenantId, tenantId), eq(emailAccounts.id, accountId))),
  )
}

// ── Threads ───────────────────────────────────────────────────────────────────

export type ThreadListItem = EmailThread & {
  fromPreview: string | null
  contactName: string | null
}

export async function listThreads(
  tenantId: string,
  accountId: string,
  opts: { status?: 'open' | 'snoozed' | 'closed'; limit?: number } = {},
): Promise<ThreadListItem[]> {
  return withTenant(tenantId, async (tx) => {
    const whereClauses = [
      eq(emailThreads.tenantId, tenantId),
      eq(emailThreads.accountId, accountId),
    ]
    if (opts.status) whereClauses.push(eq(emailThreads.status, opts.status))

    const rows = await tx
      .select({
        thread: emailThreads,
        contactName: contacts.name,
      })
      .from(emailThreads)
      .leftJoin(contacts, eq(contacts.id, emailThreads.contactId))
      .where(and(...whereClauses))
      .orderBy(desc(emailThreads.lastMessageAt))
      .limit(opts.limit ?? 100)

    if (rows.length === 0) return []
    const threadIds = rows.map((r) => r.thread.id)
    // Pull the latest from_name/from_addr per thread for the list preview
    const latest = await tx
      .select({
        threadId: emailMessages.threadId,
        fromAddr: emailMessages.fromAddr,
        fromName: emailMessages.fromName,
        sentAt: emailMessages.sentAt,
      })
      .from(emailMessages)
      .where(sql`${emailMessages.threadId} = ANY(${threadIds})`)
      .orderBy(desc(emailMessages.sentAt))
    const seen = new Map<string, string>()
    for (const m of latest) {
      if (!seen.has(m.threadId)) {
        seen.set(m.threadId, m.fromName ? `${m.fromName} <${m.fromAddr}>` : m.fromAddr)
      }
    }
    return rows.map((r) => ({
      ...r.thread,
      fromPreview: seen.get(r.thread.id) ?? null,
      contactName: r.contactName,
    }))
  })
}

export async function getThread(tenantId: string, threadId: string): Promise<{
  thread: EmailThread
  messages: EmailMessage[]
} | null> {
  return withTenant(tenantId, async (tx) => {
    const [thread] = await tx.select().from(emailThreads)
      .where(and(eq(emailThreads.tenantId, tenantId), eq(emailThreads.id, threadId)))
      .limit(1)
    if (!thread) return null
    const messages = await tx.select().from(emailMessages)
      .where(eq(emailMessages.threadId, threadId))
      .orderBy(asc(emailMessages.sentAt))
    return { thread, messages }
  })
}

export async function updateThread(
  tenantId: string,
  threadId: string,
  patch: { status?: 'open' | 'snoozed' | 'closed'; assignedTo?: string | null },
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.update(emailThreads)
      .set(patch)
      .where(and(eq(emailThreads.tenantId, tenantId), eq(emailThreads.id, threadId))),
  )
}

export async function markThreadRead(tenantId: string, threadId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx.update(emailMessages)
      .set({ read: true })
      .where(eq(emailMessages.threadId, threadId))
    await tx.update(emailThreads)
      .set({ unreadCount: 0 })
      .where(and(eq(emailThreads.tenantId, tenantId), eq(emailThreads.id, threadId)))
  })
}

// ── Message ingestion (used by IMAP sync and outbound send) ──────────────────

export type IngestInput = {
  accountId: string
  messageId: string | null
  inReplyTo: string | null
  refs: string | null
  direction: 'inbound' | 'outbound'
  fromAddr: string
  fromName: string | null
  toAddrs: string[]
  ccAddrs: string[]
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  sentAt: Date
  imapUid?: number | null
}

function snippetOf(text: string | null, html: string | null): string {
  const src = text ?? (html ? html.replace(/<[^>]+>/g, ' ') : '')
  return src.replace(/\s+/g, ' ').trim().slice(0, 140)
}

export async function ingestMessage(tenantId: string, input: IngestInput): Promise<EmailMessage> {
  return withTenant(tenantId, async (tx) => {
    // Dedup by (account_id, message_id)
    if (input.messageId) {
      const existing = await tx.select().from(emailMessages)
        .where(and(
          eq(emailMessages.accountId, input.accountId),
          eq(emailMessages.messageId, input.messageId),
        ))
        .limit(1)
      if (existing[0]) return existing[0]
    }

    // Thread resolution: try In-Reply-To, then any reference id, else new thread
    let threadId: string | null = null
    const refIds: string[] = []
    if (input.inReplyTo) refIds.push(input.inReplyTo)
    if (input.refs) refIds.push(...input.refs.split(/\s+/).filter(Boolean))

    if (refIds.length > 0) {
      const found = await tx.select({ threadId: emailMessages.threadId })
        .from(emailMessages)
        .where(and(
          eq(emailMessages.accountId, input.accountId),
          sql`${emailMessages.messageId} = ANY(${refIds})`,
        ))
        .limit(1)
      if (found[0]) threadId = found[0].threadId
    }

    if (!threadId) {
      // Try to link to a contact by from address
      const fromLc = input.fromAddr.toLowerCase()
      const contactRows = await tx.select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, fromLc)))
        .limit(1)

      const [newThread] = await tx.insert(emailThreads).values({
        tenantId,
        accountId: input.accountId,
        subject: input.subject ?? null,
        contactId: contactRows[0]?.id ?? null,
        lastMessageAt: input.sentAt,
        unreadCount: input.direction === 'inbound' ? 1 : 0,
        messageCount: 0,
      }).returning()
      threadId = newThread.id
    }

    const [msg] = await tx.insert(emailMessages).values({
      tenantId,
      accountId: input.accountId,
      threadId,
      messageId: input.messageId,
      inReplyTo: input.inReplyTo,
      refs: input.refs,
      direction: input.direction,
      fromAddr: input.fromAddr.toLowerCase(),
      fromName: input.fromName,
      toAddrs: input.toAddrs,
      ccAddrs: input.ccAddrs,
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      snippet: snippetOf(input.bodyText, input.bodyHtml),
      sentAt: input.sentAt,
      imapUid: input.imapUid ?? null,
    }).returning()

    // Bump thread counters
    await tx.update(emailThreads)
      .set({
        lastMessageAt: input.sentAt,
        messageCount: sql`${emailThreads.messageCount} + 1`,
        unreadCount: input.direction === 'inbound'
          ? sql`${emailThreads.unreadCount} + 1`
          : emailThreads.unreadCount,
      })
      .where(eq(emailThreads.id, threadId))

    return msg
  })
}

export async function addAttachment(
  tenantId: string,
  messageId: string,
  data: { filename: string; contentType?: string | null; sizeBytes?: number | null; storageKey?: string | null },
): Promise<EmailAttachment> {
  const [row] = await withTenant(tenantId, (tx) =>
    tx.insert(emailAttachments).values({
      tenantId,
      messageId,
      filename: data.filename,
      contentType: data.contentType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      storageKey: data.storageKey ?? null,
    }).returning(),
  )
  return row
}

export async function listAttachments(tenantId: string, messageId: string): Promise<EmailAttachment[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(emailAttachments)
      .where(and(eq(emailAttachments.tenantId, tenantId), eq(emailAttachments.messageId, messageId))),
  )
}

// ── Sync metadata ────────────────────────────────────────────────────────────

export async function recordSync(
  tenantId: string,
  accountId: string,
  result: { ok: true } | { ok: false; error: string },
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.update(emailAccounts)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: result.ok ? null : result.error.slice(0, 500),
      })
      .where(and(eq(emailAccounts.tenantId, tenantId), eq(emailAccounts.id, accountId))),
  )
}
