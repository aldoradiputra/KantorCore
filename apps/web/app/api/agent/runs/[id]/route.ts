import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getRun } from '../../../../../lib/agent'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const { id } = await params
  const detail = await getRun(result.ctx.tenant.id, id)
  if (!detail) return NextResponse.json({ error: 'Run tidak ditemukan.' }, { status: 404 })

  return NextResponse.json({ run: detail.run, toolCalls: detail.toolCalls })
}
