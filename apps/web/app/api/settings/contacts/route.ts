import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listContacts, createContact } from '../../../../lib/contacts'
import type { ContactRole, ContactType } from '@kantorcore/db'

const TYPES: ReadonlyArray<ContactType> = ['company', 'individual']
const ROLES: ReadonlyArray<ContactRole> = ['staff', 'customer', 'vendor', 'lead', 'other']

function asRoles(input: unknown): ContactRole[] {
  if (!Array.isArray(input)) return []
  return input.filter((r): r is ContactRole => typeof r === 'string' && (ROLES as readonly string[]).includes(r))
}

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const contacts = await listContacts(ctx.tenant.id)
  return NextResponse.json({ contacts })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Missing name.' }, { status: 400 })
  }

  const type: ContactType = TYPES.includes(body.type) ? body.type : 'individual'

  const res = await createContact(ctx.tenant.id, {
    type,
    name: body.name,
    email: typeof body.email === 'string' ? body.email : null,
    phone: typeof body.phone === 'string' ? body.phone : null,
    npwp: typeof body.npwp === 'string' ? body.npwp : null,
    address: typeof body.address === 'string' ? body.address : null,
    userId: typeof body.userId === 'string' ? body.userId : null,
    roles: asRoles(body.roles),
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ contact: res.contact }, { status: 201 })
}
