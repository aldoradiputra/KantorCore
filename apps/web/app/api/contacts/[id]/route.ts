import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { updateContact, deleteContact } from '../../../../lib/contacts'
import type { ContactRole, ContactType, ContactAddressType } from '@kantorcore/db'

const TYPES: ReadonlyArray<ContactType> = ['company', 'individual']
const ADDR_TYPES: ReadonlyArray<ContactAddressType> = ['main', 'invoice', 'delivery', 'contact', 'other']
const ROLES: ReadonlyArray<ContactRole> = ['staff', 'customer', 'vendor', 'lead', 'other']

function asRoles(input: unknown): ContactRole[] {
  if (!Array.isArray(input)) return []
  return input.filter((r): r is ContactRole => typeof r === 'string' && (ROLES as readonly string[]).includes(r))
}

function strOrUndef(v: unknown): string | null | undefined {
  if (v === null) return null
  if (typeof v === 'string') return v
  return undefined
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const res = await updateContact(ctx.tenant.id, id, {
    type: TYPES.includes(body.type) ? body.type : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    email: strOrUndef(body.email),
    phone: strOrUndef(body.phone),
    npwp: strOrUndef(body.npwp),
    address: strOrUndef(body.address),
    notes: strOrUndef(body.notes),
    userId: strOrUndef(body.userId),
    roles: Array.isArray(body.roles) ? asRoles(body.roles) : undefined,
    parentId: strOrUndef(body.parentId),
    addressType: ADDR_TYPES.includes(body.addressType) ? body.addressType : undefined,
    isPkp: typeof body.isPkp === 'boolean' ? body.isPkp : undefined,
    website: strOrUndef(body.website),
    language: strOrUndef(body.language),
    country: strOrUndef(body.country),
    addrLine1: strOrUndef(body.addrLine1),
    addrLine2: strOrUndef(body.addrLine2),
    addrRt: strOrUndef(body.addrRt),
    addrRw: strOrUndef(body.addrRw),
    addrKelurahan: strOrUndef(body.addrKelurahan),
    addrKecamatan: strOrUndef(body.addrKecamatan),
    addrKota: strOrUndef(body.addrKota),
    addrProvinsi: strOrUndef(body.addrProvinsi),
    addrKodePos: strOrUndef(body.addrKodePos),
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ contact: res.contact })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { id } = await params
  await deleteContact(ctx.tenant.id, id)
  return NextResponse.json({ ok: true })
}
