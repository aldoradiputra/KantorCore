import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import nodemailer from 'nodemailer'
import type { EmailAccount } from '@kantorcore/db'
import { getAccountWithCreds, ingestMessage, recordSync, addAttachment } from './email'

const FETCH_LIMIT = 50

/**
 * Pulls the latest N messages from INBOX and ingests any new ones.
 * Returns the count of newly stored messages.
 */
export async function syncAccount(tenantId: string, accountId: string): Promise<{ added: number }> {
  const account = await getAccountWithCreds(tenantId, accountId)
  if (!account) throw new Error('Akun email tidak ditemukan.')
  if (!account.active) throw new Error('Akun email tidak aktif.')

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: { user: account.imapUser, pass: account.imapPassword },
    logger: false,
  })

  let added = 0
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const mailbox = client.mailbox
      const exists = typeof mailbox === 'object' && mailbox ? mailbox.exists : 0
      const startSeq = Math.max(1, exists - FETCH_LIMIT + 1)
      const range = `${startSeq}:*`

      for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true })) {
        const parsed = await simpleParser(msg.source as Buffer)

        const from = parsed.from?.value?.[0]
        const fromAddr = from?.address ?? msg.envelope?.from?.[0]?.address ?? ''
        if (!fromAddr) continue

        const toList = parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : []
        const toAddrs = toList.flatMap((g) => g.value.map((v) => v.address ?? '').filter(Boolean))
        const ccList = parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : []
        const ccAddrs = ccList.flatMap((g) => g.value.map((v) => v.address ?? '').filter(Boolean))

        const before = added
        const stored = await ingestMessage(tenantId, {
          accountId,
          messageId: parsed.messageId ?? null,
          inReplyTo: parsed.inReplyTo ?? null,
          refs: Array.isArray(parsed.references)
            ? parsed.references.join(' ')
            : (parsed.references ?? null),
          direction: 'inbound',
          fromAddr,
          fromName: from?.name || null,
          toAddrs,
          ccAddrs,
          subject: parsed.subject ?? null,
          bodyText: parsed.text ?? null,
          bodyHtml: typeof parsed.html === 'string' ? parsed.html : null,
          sentAt: parsed.date ?? new Date(),
          imapUid: typeof msg.uid === 'number' ? msg.uid : null,
        })

        // ingestMessage returns an existing message on dedupe — check createdAt vs sentAt to detect new
        const isNew = stored.createdAt.getTime() >= Date.now() - 5_000
        if (isNew) added++
        void before

        for (const att of parsed.attachments ?? []) {
          if (!att.filename) continue
          await addAttachment(tenantId, stored.id, {
            filename: att.filename,
            contentType: att.contentType ?? null,
            sizeBytes: att.size ?? null,
          })
        }
      }
    } finally {
      lock.release()
    }
    await recordSync(tenantId, accountId, { ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await recordSync(tenantId, accountId, { ok: false, error: msg })
    throw err
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return { added }
}

export type SendInput = {
  to: string[]
  cc?: string[]
  subject: string
  text?: string
  html?: string
  inReplyTo?: string | null
  references?: string | null
}

export type SendResult = {
  messageId: string
  envelope: { from: string; to: string[] }
}

export async function sendFromAccount(
  account: EmailAccount,
  input: SendInput,
): Promise<SendResult> {
  const transport = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: { user: account.smtpUser, pass: account.smtpPassword },
  })

  const info = await transport.sendMail({
    from: `${account.label} <${account.address}>`,
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
    inReplyTo: input.inReplyTo ?? undefined,
    references: input.references ?? undefined,
  })

  const envFrom = info.envelope.from
  return {
    messageId: info.messageId,
    envelope: {
      from: typeof envFrom === 'string' ? envFrom : account.address,
      to: info.envelope.to ?? input.to,
    },
  }
}
