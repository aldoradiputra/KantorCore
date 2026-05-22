import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { getConversation, getChannelDecrypted, ingestMessage } from '../../../../../../lib/omni'
import { getAccountWithCreds } from '../../../../../../lib/email'
import { sendFromAccount } from '../../../../../../lib/email-transport'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  const text: string = (body.text ?? '').toString().trim()
  if (!text) return NextResponse.json({ error: 'Isi pesan diperlukan.' }, { status: 400 })

  const data = await getConversation(ctx.tenant.id, id)
  if (!data) return NextResponse.json({ error: 'Percakapan tidak ditemukan.' }, { status: 404 })

  const { conv, channel } = data

  // For email channel — send via SMTP
  if (channel.type === 'email') {
    const config = (await getChannelDecrypted(ctx.tenant.id, channel.id))?.config as { emailAccountId?: string }
    if (!config?.emailAccountId) {
      return NextResponse.json({ error: 'Akun email belum dikonfigurasi.' }, { status: 400 })
    }
    const emailAccount = await getAccountWithCreds(ctx.tenant.id, config.emailAccountId)
    if (!emailAccount) return NextResponse.json({ error: 'Akun email tidak ditemukan.' }, { status: 404 })

    if (!conv.contactIdentifier) {
      return NextResponse.json({ error: 'Tidak ada email tujuan.' }, { status: 400 })
    }

    try {
      const sent = await sendFromAccount(emailAccount, {
        to: [conv.contactIdentifier],
        subject: conv.subject ? `Re: ${conv.subject.replace(/^Re:\s*/i, '')}` : 'Re: (tanpa subjek)',
        text,
        inReplyTo: conv.externalRef,
        references: conv.externalRef,
      })
      await ingestMessage(ctx.tenant.id, {
        channelId: channel.id,
        direction: 'outbound',
        body: text,
        fromName: ctx.session.user.name,
        authorId: ctx.session.user.id,
        externalRef: conv.externalRef,
        metadata: { emailMessageId: sent.messageId },
      })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Kirim gagal.' }, { status: 500 })
    }
  } else {
    // web_chat and other channels — just store the message
    await ingestMessage(ctx.tenant.id, {
      channelId: channel.id,
      direction: 'outbound',
      body: text,
      fromName: ctx.session.user.name,
      authorId: ctx.session.user.id,
      externalRef: conv.externalRef,
    })
  }

  const updated = await getConversation(ctx.tenant.id, id)
  return NextResponse.json(updated?.messages.at(-1) ?? { ok: true }, { status: 201 })
}
