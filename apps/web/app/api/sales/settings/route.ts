import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getSalesSettings, updateSalesSettings } from '../../../../lib/sales-settings'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const settings = await getSalesSettings(ctx.tenant.id)
  return NextResponse.json({ settings })
}

export async function PATCH(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })

  const settings = await updateSalesSettings(ctx.tenant.id, body)
  return NextResponse.json({ settings })
}
