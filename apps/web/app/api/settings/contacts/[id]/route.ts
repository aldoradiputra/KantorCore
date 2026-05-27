import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { updateContact, deleteContact } from '../../../../../lib/contacts'
import type { ContactRole, ContactType } from '@kantorcore/db'

const TYPES: ReadonlyArray<ContactType> = ['company', 'individual']
const ROLES: ReadonlyArray<ContactRole> = ['staff', 'customer', 'vendor', 'lead', 'other']

function asRoles(input: unknown): ContactRole[] {
  if (!Array.isArray(input)) return []
  return input.filter((r): r is ContactRole => typeof r === 'string' && (ROLES as readonly string[]).includes(r))
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const res = await updateContact(ctx.tenant.id, id, {
    type: TYPES.includes(body.type) ? body.type : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    email: body.email === null ? null : typeof body.email === 'string' ? body.email : undefined,
    phone: body.phone === null ? null : typeof body.phone === 'string' ? body.phone : undefined,
    npwp: body.npwp === null ? null : typeof body.npwp === 'string' ? body.npwp : undefined,
    address: body.address === null ? null : typeof body.address === 'string' ? body.address : undefined,
    userId: body.userId === null ? null : typeof body.userId === 'string' ? body.userId : undefined,
    roles: Array.isArray(body.roles) ? asRoles(body.roles) : undefined,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ contact: res.contact })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  await deleteContact(ctx.tenant.id, id)
  return NextResponse.json({ ok: true })
}
