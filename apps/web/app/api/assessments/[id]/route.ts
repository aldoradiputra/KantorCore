import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getAssessment } from '../../../../lib/assessment'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const data = await getAssessment(ctx.tenant.id, id)
  if (!data) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(data)
}
