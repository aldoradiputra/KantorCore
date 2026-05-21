import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { seedDefaultUom } from '../../../../../lib/products'

export async function POST() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const count = await seedDefaultUom(ctx.tenant.id)
  return NextResponse.json({ seeded: count })
}
