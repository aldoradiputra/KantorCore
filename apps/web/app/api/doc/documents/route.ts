import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listDocuments, createDocument, type DocType } from '../../../../lib/documents'

const VALID_TYPES: DocType[] = ['contract','nda','mou','agreement','po','invoice','permit','other']

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as any
  const type = searchParams.get('type') as any
  const list = await listDocuments(ctx.tenant.id, {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  })
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json()
  const res = await createDocument({
    tenantId:   ctx.tenant.id,
    userId:     ctx.session.user.id,
    title:      body.title,
    type:       VALID_TYPES.includes(body.type) ? body.type : 'contract',
    contactId:  body.contactId ?? null,
    partyName:  body.partyName ?? null,
    startDate:  body.startDate ?? null,
    expiryDate: body.expiryDate ?? null,
    value:      body.value ?? 0,
    fileUrl:    body.fileUrl ?? null,
    notes:      body.notes ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.doc, { status: 201 })
}
