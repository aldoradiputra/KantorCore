import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import {
  listEvents,
  logNote,
  recordSentEmail,
  scheduleActivity,
} from '../../../../lib/chatter'
import type { ChatterActivityType } from '../../../../lib/chatter'
import { getAccountWithCreds } from '../../../../lib/email'
import { sendFromAccount } from '../../../../lib/email-transport'

export const runtime = 'nodejs'

const VALID_ACTIVITY_TYPES: ChatterActivityType[] = ['call', 'meeting', 'todo', 'email', 'deadline']

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType')
  const entityId = url.searchParams.get('entityId')
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType dan entityId diperlukan.' }, { status: 400 })
  }

  const events = await listEvents(ctx.tenant.id, entityType, entityId)
  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json()
  const { entityType, entityId, eventType } = body

  if (!entityType || !entityId || !eventType) {
    return NextResponse.json({ error: 'entityType, entityId, eventType diperlukan.' }, { status: 400 })
  }

  const authorUserId = ctx.session.user.id
  const authorName = ctx.session.user.name

  if (eventType === 'log_note') {
    if (!body.body?.trim()) return NextResponse.json({ error: 'Isi catatan diperlukan.' }, { status: 400 })
    const event = await logNote(ctx.tenant.id, {
      entityType, entityId, body: body.body, bodyHtml: body.bodyHtml ?? null,
      authorUserId, authorName,
    })
    return NextResponse.json(event, { status: 201 })
  }

  if (eventType === 'send_email') {
    const to: string[] = Array.isArray(body.to) ? body.to.filter(Boolean) : []
    if (to.length === 0) return NextResponse.json({ error: 'Tujuan email diperlukan.' }, { status: 400 })
    if (!body.subject?.trim()) return NextResponse.json({ error: 'Subjek diperlukan.' }, { status: 400 })
    if (!body.body?.trim()) return NextResponse.json({ error: 'Isi email diperlukan.' }, { status: 400 })

    let emailMessageId: string | null = null

    // If an accountId is provided, send via IS-EMAIL SMTP
    if (body.accountId) {
      const account = await getAccountWithCreds(ctx.tenant.id, body.accountId)
      if (!account) return NextResponse.json({ error: 'Akun email tidak ditemukan.' }, { status: 404 })
      try {
        const sent = await sendFromAccount(account, {
          to,
          cc: body.cc ?? [],
          subject: body.subject,
          text: body.body,
          html: body.bodyHtml ?? undefined,
        })
        emailMessageId = sent.messageId
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pengiriman gagal.'
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    const event = await recordSentEmail(ctx.tenant.id, {
      entityType, entityId,
      subject: body.subject, body: body.body, bodyHtml: body.bodyHtml ?? null,
      toAddrs: to, ccAddrs: body.cc ?? [],
      authorUserId, authorName, emailMessageId,
    })
    return NextResponse.json(event, { status: 201 })
  }

  if (eventType === 'activity_scheduled') {
    const actType: string = body.activityType ?? ''
    if (!VALID_ACTIVITY_TYPES.includes(actType as ChatterActivityType)) {
      return NextResponse.json({ error: 'Tipe aktivitas tidak valid.' }, { status: 400 })
    }
    if (!body.activityDue) return NextResponse.json({ error: 'Tenggat diperlukan.' }, { status: 400 })

    const event = await scheduleActivity(ctx.tenant.id, {
      entityType, entityId,
      activityType: actType as ChatterActivityType,
      activityDue: new Date(body.activityDue),
      body: body.body ?? null,
      authorUserId, authorName,
    })
    return NextResponse.json(event, { status: 201 })
  }

  return NextResponse.json({ error: 'eventType tidak dikenal.' }, { status: 400 })
}
