import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { updateDocStatus, type DocStatus } from '../../../../../../lib/documents'

const VALID: DocStatus[] = ['draft','active','expired','terminated']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const body = await req.json()
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 })
  }
  const res = await updateDocStatus(ctx.tenant.id, id, body.status)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.doc)
}
