import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { issueGiftCard, listVouchers } from '../../../../lib/promotions'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId') ?? undefined
  const search = searchParams.get('search') ?? undefined

  const rows = await listVouchers(ctx.tenant.id, { type: 'gift_card', contactId, search })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { amountMinor, contactId, validTo, notes } = body

  if (!amountMinor || amountMinor <= 0)
    return NextResponse.json({ error: 'Nominal diperlukan.' }, { status: 400 })

  const giftCard = await issueGiftCard(ctx.tenant.id, {
    amountMinor,
    contactId: contactId || null,
    validTo: validTo || null,
    notes: notes?.trim() || null,
    createdBy: ctx.session.user.id,
  })

  return NextResponse.json(giftCard, { status: 201 })
}
