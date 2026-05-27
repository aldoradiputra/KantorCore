import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getContactHierarchy } from '../../../../../lib/contacts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { id } = await params
  const hierarchy = await getContactHierarchy(ctx.tenant.id, id)
  if (!hierarchy) return NextResponse.json({ error: 'Kontak tidak ditemukan.' }, { status: 404 })

  return NextResponse.json(hierarchy)
}
