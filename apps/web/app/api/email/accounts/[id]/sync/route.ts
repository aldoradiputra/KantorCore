import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { syncAccount } from '../../../../../../lib/email-transport'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  try {
    const out = await syncAccount(ctx.tenant.id, id)
    return NextResponse.json(out)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync gagal.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
