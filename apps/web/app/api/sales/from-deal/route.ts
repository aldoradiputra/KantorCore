import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { createSOFromDeal } from '../../../../lib/sales'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body?.dealId) return NextResponse.json({ error: 'dealId wajib diisi.' }, { status: 400 })

  const res = await createSOFromDeal({
    tenantId:      ctx.tenant.id,
    userId:        ctx.session.user.id,
    dealId:        body.dealId,
    expectedClose: body.expectedClose ?? null,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ so: res.so }, { status: 201 })
}
