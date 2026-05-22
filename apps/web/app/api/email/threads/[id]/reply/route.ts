import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { getThread, getAccountWithCreds, ingestMessage } from '../../../../../../lib/email'
import { sendFromAccount } from '../../../../../../lib/email-transport'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  const text: string = (body.text ?? '').toString()
  const html: string | undefined = body.html ? String(body.html) : undefined
  const to: string[] = Array.isArray(body.to) ? body.to.filter(Boolean) : []
  const cc: string[] = Array.isArray(body.cc) ? body.cc.filter(Boolean) : []
  if (to.length === 0) return NextResponse.json({ error: 'Tujuan diperlukan.' }, { status: 400 })
  if (!text.trim() && !html) return NextResponse.json({ error: 'Isi balasan diperlukan.' }, { status: 400 })

  const data = await getThread(ctx.tenant.id, id)
  if (!data) return NextResponse.json({ error: 'Thread tidak ditemukan.' }, { status: 404 })

  const account = await getAccountWithCreds(ctx.tenant.id, data.thread.accountId)
  if (!account) return NextResponse.json({ error: 'Akun email tidak ditemukan.' }, { status: 404 })

  const last = data.messages[data.messages.length - 1]
  const subject = data.thread.subject?.startsWith('Re: ')
    ? data.thread.subject
    : `Re: ${data.thread.subject ?? '(no subject)'}`

  const inReplyTo = last?.messageId ?? null
  const refs = [last?.refs, last?.messageId].filter(Boolean).join(' ') || null

  try {
    const sent = await sendFromAccount(account, {
      to,
      cc,
      subject,
      text: text || undefined,
      html,
      inReplyTo,
      references: refs,
    })

    const msg = await ingestMessage(ctx.tenant.id, {
      accountId: account.id,
      messageId: sent.messageId,
      inReplyTo,
      refs,
      direction: 'outbound',
      fromAddr: account.address,
      fromName: account.label,
      toAddrs: to,
      ccAddrs: cc,
      subject,
      bodyText: text || null,
      bodyHtml: html ?? null,
      sentAt: new Date(),
    })
    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kirim gagal.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
