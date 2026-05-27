import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../lib/requireSession'
import { listContacts, listContactsKanban, createContact } from '../../../lib/contacts'
import type { ContactRole, ContactType, ContactAddressType } from '@kantorcore/db'

const TYPES: ReadonlyArray<ContactType> = ['company', 'individual']
const ROLES: ReadonlyArray<ContactRole> = ['staff', 'customer', 'vendor', 'lead', 'other']
const ADDR_TYPES: ReadonlyArray<ContactAddressType> = ['main', 'invoice', 'delivery', 'contact', 'other']

function asRoles(input: unknown): ContactRole[] {
  if (!Array.isArray(input)) return []
  return input.filter((r): r is ContactRole => typeof r === 'string' && (ROLES as readonly string[]).includes(r))
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'list'

  if (view === 'kanban') {
    const kanban = await listContactsKanban(ctx.tenant.id)
    return NextResponse.json(kanban)
  }

  // list (default) and map both return flat array; map adds formatted address fields
  const contacts = await listContacts(ctx.tenant.id)

  if (view === 'map') {
    const mapData = contacts.map((r) => ({
      ...r,
      formattedAddress: r.contact.country === 'ID'
        ? [r.contact.addrLine1, r.contact.addrKelurahan, r.contact.addrKecamatan, r.contact.addrKota, r.contact.addrProvinsi].filter(Boolean).join(', ')
        : r.contact.address ?? '',
      coords: null, // geocoding out of scope per spec §10
    }))
    return NextResponse.json({ contacts: mapData })
  }

  return NextResponse.json({ contacts })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Missing name.' }, { status: 400 })
  }

  const type: ContactType = TYPES.includes(body.type) ? body.type : 'individual'
  const addressType: ContactAddressType | null = ADDR_TYPES.includes(body.addressType) ? body.addressType : 'main'

  const res = await createContact(ctx.tenant.id, {
    type,
    name: body.name,
    email: str(body.email),
    phone: str(body.phone),
    npwp: str(body.npwp),
    address: str(body.address),
    notes: str(body.notes),
    userId: str(body.userId),
    roles: asRoles(body.roles),
    parentId: str(body.parentId),
    addressType,
    isPkp: body.isPkp === true,
    website: str(body.website),
    language: str(body.language),
    country: str(body.country),
    addrLine1: str(body.addrLine1),
    addrLine2: str(body.addrLine2),
    addrRt: str(body.addrRt),
    addrRw: str(body.addrRw),
    addrKelurahan: str(body.addrKelurahan),
    addrKecamatan: str(body.addrKecamatan),
    addrKota: str(body.addrKota),
    addrProvinsi: str(body.addrProvinsi),
    addrKodePos: str(body.addrKodePos),
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ contact: res.contact }, { status: 201 })
}
