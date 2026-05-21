import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { validateVoucher } from '../../../../../lib/promotions'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json()
  const { code, orderValueMinor } = body

  if (!code?.trim()) return NextResponse.json({ error: 'Kode diperlukan.' }, { status: 400 })

  const validation = await validateVoucher(ctx.tenant.id, code, orderValueMinor ?? 0)
  return NextResponse.json(validation)
}
