import 'server-only'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import {
  contacts,
  contactRoles,
  contactBankAccounts,
  contactFinancialProfiles,
  users,
  type Contact,
  type ContactRole,
  type ContactType,
  type ContactAddressType,
  type ContactBankAccount,
  type ContactFinancialProfile,
} from '@kantorcore/db'
import { withTenant } from './db'
import { syncContactRelated } from './relatedFields'

// ── Row types ──────────────────────────────────────────────────

export interface ContactRow {
  contact: Contact
  roles: ContactRole[]
  linkedUser: { id: string; name: string; email: string } | null
}

export interface ContactWithInheritance extends ContactRow {
  /** Financial profile with parent-company fallback applied. NULL if no profile anywhere. */
  effectiveFinancials: ContactFinancialProfile | null
  parent: Contact | null
}

export interface ContactHierarchy {
  contact: Contact
  parent: Contact | null
  children: Contact[]
}

// ── Indonesian address helpers ─────────────────────────────────

export interface IndonesianAddress {
  line1?: string | null
  line2?: string | null
  rt?: string | null
  rw?: string | null
  kelurahan?: string | null
  kecamatan?: string | null
  kota?: string | null
  provinsi?: string | null
  kodePos?: string | null
}

/** Format Indonesian address to standard formal postal string. */
export function formatIndonesianAddress(addr: IndonesianAddress): string {
  const street = [addr.line1?.trim(), addr.line2?.trim()].filter(Boolean).join(', ')
  const rtRw = addr.rt || addr.rw
    ? `RT ${(addr.rt ?? '0').padStart(3, '0')}/RW ${(addr.rw ?? '0').padStart(3, '0')}`
    : null
  const parts = [street, rtRw, addr.kelurahan?.trim(), addr.kecamatan?.trim(), addr.kota?.trim(), addr.kodePos?.trim()].filter(Boolean)
  const body = parts.join(' ')
  if (!body && !addr.provinsi) return ''
  if (addr.provinsi) return `${body}, ${addr.provinsi.trim().toUpperCase()} INDONESIA`
  return `${body} INDONESIA`
}

// ── List / get ─────────────────────────────────────────────────

export async function listContacts(
  tenantId: string,
  filters: { search?: string; role?: ContactRole; type?: ContactType } = {},
): Promise<ContactRow[]> {
  return withTenant(tenantId, async (tx) => {
    let whereCond = eq(contacts.tenantId, tenantId)
    if (filters.type) {
      whereCond = and(whereCond, eq(contacts.type, filters.type))!
    }
    if (filters.search) {
      const q = `%${filters.search}%`
      whereCond = and(
        whereCond,
        or(ilike(contacts.name, q), ilike(contacts.email, q), ilike(contacts.phone, q))!,
      )!
    }

    const rows = await tx
      .select({
        contact: contacts,
        linkedUserId: users.id,
        linkedUserName: users.name,
        linkedUserEmail: users.email,
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.userId, users.id))
      .where(whereCond)
      .orderBy(asc(contacts.name))

    if (rows.length === 0) return []

    const contactIds = rows.map((r) => r.contact.id)
    const roleRows = contactIds.length > 0
      ? await tx.select().from(contactRoles)
          .where(and(eq(contactRoles.tenantId, tenantId), inArray(contactRoles.contactId, contactIds)))
      : []

    const filtered = filters.role
      ? rows.filter((r) => roleRows.some((rr) => rr.contactId === r.contact.id && rr.role === filters.role))
      : rows

    return filtered.map((r) => ({
      contact: r.contact,
      roles: roleRows.filter((rr) => rr.contactId === r.contact.id).map((rr) => rr.role),
      linkedUser: r.linkedUserId && r.linkedUserName && r.linkedUserEmail
        ? { id: r.linkedUserId, name: r.linkedUserName, email: r.linkedUserEmail }
        : null,
    }))
  })
}

/** Returns kanban payload grouped by parent company. */
export async function listContactsKanban(tenantId: string): Promise<{
  companies: ContactRow[]
  byCompany: Record<string, ContactRow[]>
  orphans: ContactRow[]
}> {
  const all = await listContacts(tenantId)
  const companies = all.filter((r) => r.contact.type === 'company')
  const byCompany: Record<string, ContactRow[]> = {}
  const orphans: ContactRow[] = []

  for (const ind of all.filter((r) => r.contact.type === 'individual')) {
    const pid = ind.contact.parentId
    if (pid) {
      byCompany[pid] ??= []
      byCompany[pid]!.push(ind)
    } else {
      orphans.push(ind)
    }
  }

  return { companies, byCompany, orphans }
}

export async function getContact(tenantId: string, contactId: string): Promise<ContactRow | null> {
  const rows = await listContacts(tenantId)
  return rows.find((r) => r.contact.id === contactId) ?? null
}

/**
 * Fetch a single contact with inherited financial data.
 * Individual contacts inherit NULL fields from their parent Company's profile.
 */
export async function getContactWithInheritance(
  tenantId: string,
  contactId: string,
): Promise<ContactWithInheritance | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ contact: contacts, linkedUserId: users.id, linkedUserName: users.name, linkedUserEmail: users.email })
      .from(contacts)
      .leftJoin(users, eq(contacts.userId, users.id))
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1)

    if (rows.length === 0) return null
    const r = rows[0]!

    const roleRows = await tx.select().from(contactRoles)
      .where(and(eq(contactRoles.contactId, contactId), eq(contactRoles.tenantId, tenantId)))

    const [ownProfile] = await tx.select().from(contactFinancialProfiles)
      .where(eq(contactFinancialProfiles.contactId, contactId))
      .limit(1)

    let parent: Contact | null = null
    let effectiveFinancials: ContactFinancialProfile | null = ownProfile ?? null

    if (r.contact.parentId) {
      const [parentRow] = await tx.select().from(contacts)
        .where(and(eq(contacts.id, r.contact.parentId), eq(contacts.tenantId, tenantId)))
        .limit(1)
      parent = parentRow ?? null

      if (parent) {
        const [parentProfile] = await tx.select().from(contactFinancialProfiles)
          .where(eq(contactFinancialProfiles.contactId, parent.id))
          .limit(1)

        if (!ownProfile && parentProfile) {
          effectiveFinancials = parentProfile
        } else if (ownProfile && parentProfile) {
          // Merge: fill NULL fields from parent
          effectiveFinancials = {
            ...ownProfile,
            paymentTermsId: ownProfile.paymentTermsId ?? parentProfile.paymentTermsId,
            paymentTermsLabel: ownProfile.paymentTermsLabel ?? parentProfile.paymentTermsLabel,
            pricelistId: ownProfile.pricelistId ?? parentProfile.pricelistId,
            pricelistLabel: ownProfile.pricelistLabel ?? parentProfile.pricelistLabel,
            propertyAccountReceivableId: ownProfile.propertyAccountReceivableId ?? parentProfile.propertyAccountReceivableId,
            propertyAccountReceivableLabel: ownProfile.propertyAccountReceivableLabel ?? parentProfile.propertyAccountReceivableLabel,
            propertyAccountPayableId: ownProfile.propertyAccountPayableId ?? parentProfile.propertyAccountPayableId,
            propertyAccountPayableLabel: ownProfile.propertyAccountPayableLabel ?? parentProfile.propertyAccountPayableLabel,
          }
        }
      }
    }

    return {
      contact: r.contact,
      roles: roleRows.map((rr) => rr.role),
      linkedUser: r.linkedUserId && r.linkedUserName && r.linkedUserEmail
        ? { id: r.linkedUserId, name: r.linkedUserName, email: r.linkedUserEmail }
        : null,
      effectiveFinancials,
      parent,
    }
  })
}

/** Full hierarchy tree: parent company + sibling/child individuals. */
export async function getContactHierarchy(
  tenantId: string,
  contactId: string,
): Promise<ContactHierarchy | null> {
  return withTenant(tenantId, async (tx) => {
    const [contact] = await tx.select().from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1)
    if (!contact) return null

    let parent: Contact | null = null
    if (contact.parentId) {
      const [p] = await tx.select().from(contacts)
        .where(and(eq(contacts.id, contact.parentId), eq(contacts.tenantId, tenantId)))
        .limit(1)
      parent = p ?? null
    }

    const parentRef = contact.type === 'company' ? contact.id : contact.parentId
    const children = parentRef
      ? await tx.select().from(contacts)
          .where(and(eq(contacts.tenantId, tenantId), eq(contacts.parentId, parentRef)))
          .orderBy(asc(contacts.name))
      : []

    return { contact, parent, children }
  })
}

// ── Create / Update / Delete ───────────────────────────────────

export interface ContactInput {
  type: ContactType
  name: string
  email?: string | null
  phone?: string | null
  npwp?: string | null
  address?: string | null
  notes?: string | null
  userId?: string | null
  roles: ContactRole[]
  parentId?: string | null
  addressType?: ContactAddressType | null
  isPkp?: boolean
  website?: string | null
  language?: string | null
  country?: string | null
  addrLine1?: string | null
  addrLine2?: string | null
  addrRt?: string | null
  addrRw?: string | null
  addrKelurahan?: string | null
  addrKecamatan?: string | null
  addrKota?: string | null
  addrProvinsi?: string | null
  addrKodePos?: string | null
}

export async function createContact(
  tenantId: string,
  input: ContactInput,
): Promise<{ ok: true; contact: Contact } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name || name.length < 2) return { ok: false, error: 'Nama wajib diisi minimal 2 karakter.' }
  if (input.type === 'company' && input.parentId) {
    return { ok: false, error: 'Perusahaan tidak boleh memiliki induk.' }
  }
  const email = input.email?.trim().toLowerCase() || null

  return withTenant(tenantId, async (tx) => {
    if (email) {
      const conflict = await tx.select({ id: contacts.id }).from(contacts)
        .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, email)))
        .limit(1)
      if (conflict.length > 0) return { ok: false, error: 'Email ini sudah dipakai oleh kontak lain.' }
    }

    const [contact] = await tx.insert(contacts).values({
      tenantId,
      type: input.type,
      name,
      email,
      phone: input.phone?.trim() || null,
      npwp: input.npwp?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      userId: input.userId || null,
      parentId: input.type === 'individual' ? (input.parentId || null) : null,
      addressType: input.type === 'individual' ? (input.addressType ?? 'main') : null,
      isPkp: input.isPkp ?? false,
      website: input.website?.trim() || null,
      language: input.language?.trim() || null,
      country: input.country?.trim() || null,
      addrLine1: input.addrLine1?.trim() || null,
      addrLine2: input.addrLine2?.trim() || null,
      addrRt: input.addrRt?.trim() || null,
      addrRw: input.addrRw?.trim() || null,
      addrKelurahan: input.addrKelurahan?.trim() || null,
      addrKecamatan: input.addrKecamatan?.trim() || null,
      addrKota: input.addrKota?.trim() || null,
      addrProvinsi: input.addrProvinsi?.trim() || null,
      addrKodePos: input.addrKodePos?.trim() || null,
    }).returning()

    if (input.roles.length > 0) {
      await tx.insert(contactRoles).values(
        input.roles.map((role) => ({ contactId: contact!.id, tenantId, role })),
      )
    }

    return { ok: true, contact: contact! }
  })
}

export async function updateContact(
  tenantId: string,
  contactId: string,
  input: Partial<ContactInput>,
): Promise<{ ok: true; contact: Contact } | { ok: false; error: string }> {
  const result = await withTenant(tenantId, async (tx) => {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (input.type !== undefined) {
      patch.type = input.type
      if (input.type === 'company') { patch.parentId = null; patch.addressType = null }
    }
    if (input.name !== undefined) {
      const n = input.name.trim()
      if (n.length < 2) return { ok: false as const, error: 'Nama minimal 2 karakter.' }
      patch.name = n
    }
    if (input.email !== undefined) {
      const e = input.email?.trim().toLowerCase() || null
      if (e) {
        const conflict = await tx.select({ id: contacts.id }).from(contacts)
          .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, e)))
          .limit(1)
        if (conflict.length > 0 && conflict[0]!.id !== contactId) {
          return { ok: false as const, error: 'Email ini sudah dipakai oleh kontak lain.' }
        }
      }
      patch.email = e
    }
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
    if (input.npwp !== undefined) patch.npwp = input.npwp?.trim() || null
    if (input.address !== undefined) patch.address = input.address?.trim() || null
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null
    if (input.userId !== undefined) patch.userId = input.userId || null
    if (input.parentId !== undefined) patch.parentId = input.parentId || null
    if (input.addressType !== undefined) patch.addressType = input.addressType || null
    if (input.isPkp !== undefined) patch.isPkp = input.isPkp
    if (input.website !== undefined) patch.website = input.website?.trim() || null
    if (input.language !== undefined) patch.language = input.language?.trim() || null
    if (input.country !== undefined) patch.country = input.country?.trim() || null
    if (input.addrLine1 !== undefined) patch.addrLine1 = input.addrLine1?.trim() || null
    if (input.addrLine2 !== undefined) patch.addrLine2 = input.addrLine2?.trim() || null
    if (input.addrRt !== undefined) patch.addrRt = input.addrRt?.trim() || null
    if (input.addrRw !== undefined) patch.addrRw = input.addrRw?.trim() || null
    if (input.addrKelurahan !== undefined) patch.addrKelurahan = input.addrKelurahan?.trim() || null
    if (input.addrKecamatan !== undefined) patch.addrKecamatan = input.addrKecamatan?.trim() || null
    if (input.addrKota !== undefined) patch.addrKota = input.addrKota?.trim() || null
    if (input.addrProvinsi !== undefined) patch.addrProvinsi = input.addrProvinsi?.trim() || null
    if (input.addrKodePos !== undefined) patch.addrKodePos = input.addrKodePos?.trim() || null

    const [contact] = await tx.update(contacts).set(patch)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .returning()

    if (!contact) return { ok: false as const, error: 'Kontak tidak ditemukan.' }

    if (input.roles !== undefined) {
      await tx.delete(contactRoles)
        .where(and(eq(contactRoles.contactId, contactId), eq(contactRoles.tenantId, tenantId)))
      if (input.roles.length > 0) {
        await tx.insert(contactRoles).values(
          input.roles.map((role) => ({ contactId, tenantId, role })),
        )
      }
    }

    return { ok: true as const, contact }
  })

  if (result.ok) {
    syncContactRelated(tenantId, contactId, {
      name: result.contact.name,
      email: result.contact.email,
    }).catch(() => console.error('[syncContactRelated] failed for', contactId))
  }

  return result
}

export async function deleteContact(tenantId: string, contactId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.delete(contacts).where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId))),
  )
}

// ── Financial profiles ─────────────────────────────────────────

export type FinancialProfileInput = Partial<Omit<ContactFinancialProfile, 'contactId' | 'tenantId' | 'updatedAt'>>

export async function upsertFinancialProfile(
  tenantId: string,
  contactId: string,
  input: FinancialProfileInput,
): Promise<{ ok: true; profile: ContactFinancialProfile } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [existing] = await tx.select().from(contactFinancialProfiles)
      .where(eq(contactFinancialProfiles.contactId, contactId))
      .limit(1)

    if (existing) {
      const [profile] = await tx.update(contactFinancialProfiles)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(contactFinancialProfiles.contactId, contactId))
        .returning()
      return { ok: true, profile: profile! }
    }

    const [profile] = await tx.insert(contactFinancialProfiles)
      .values({ ...input, contactId, tenantId, updatedAt: new Date() })
      .returning()
    return { ok: true, profile: profile! }
  })
}

export async function getFinancialProfile(
  tenantId: string,
  contactId: string,
): Promise<ContactFinancialProfile | null> {
  return withTenant(tenantId, async (tx) => {
    const [profile] = await tx.select().from(contactFinancialProfiles)
      .where(eq(contactFinancialProfiles.contactId, contactId))
      .limit(1)
    return profile ?? null
  })
}

// ── Bank accounts ──────────────────────────────────────────────

export interface BankAccountInput {
  accountNumber: string
  bankName?: string | null
  branch?: string | null
  routingNumber?: string | null
}

export async function listBankAccounts(tenantId: string, contactId: string): Promise<ContactBankAccount[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(contactBankAccounts)
      .where(and(eq(contactBankAccounts.contactId, contactId), eq(contactBankAccounts.tenantId, tenantId)))
      .orderBy(asc(contactBankAccounts.createdAt)),
  )
}

export async function createBankAccount(
  tenantId: string,
  contactId: string,
  input: BankAccountInput,
): Promise<ContactBankAccount> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx.insert(contactBankAccounts).values({
      contactId, tenantId,
      accountNumber: input.accountNumber.trim(),
      bankName: input.bankName?.trim() || null,
      branch: input.branch?.trim() || null,
      routingNumber: input.routingNumber?.trim() || null,
    }).returning()
    return row!
  })
}

export async function updateBankAccount(
  tenantId: string,
  bankAccountId: string,
  input: Partial<BankAccountInput>,
): Promise<ContactBankAccount | null> {
  return withTenant(tenantId, async (tx) => {
    const patch: Record<string, unknown> = {}
    if (input.accountNumber !== undefined) patch.accountNumber = input.accountNumber.trim()
    if (input.bankName !== undefined) patch.bankName = input.bankName?.trim() || null
    if (input.branch !== undefined) patch.branch = input.branch?.trim() || null
    if (input.routingNumber !== undefined) patch.routingNumber = input.routingNumber?.trim() || null
    const [row] = await tx.update(contactBankAccounts).set(patch)
      .where(and(eq(contactBankAccounts.id, bankAccountId), eq(contactBankAccounts.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

export async function deleteBankAccount(tenantId: string, bankAccountId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.delete(contactBankAccounts)
      .where(and(eq(contactBankAccounts.id, bankAccountId), eq(contactBankAccounts.tenantId, tenantId))),
  )
}

// ── Stats ──────────────────────────────────────────────────────

export interface ContactStats {
  total: number
  byRole: Record<ContactRole, number>
  linkedToUsers: number
}

export async function getContactStats(tenantId: string): Promise<ContactStats> {
  return withTenant(tenantId, async (tx) => {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
      .from(contacts).where(eq(contacts.tenantId, tenantId))

    const roleCounts = await tx
      .select({ role: contactRoles.role, count: sql<number>`count(*)::int` })
      .from(contactRoles).where(eq(contactRoles.tenantId, tenantId))
      .groupBy(contactRoles.role)

    const [{ linked }] = await tx
      .select({ linked: sql<number>`count(*)::int` })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), sql`${contacts.userId} IS NOT NULL`))

    const byRole: Record<ContactRole, number> = { staff: 0, customer: 0, vendor: 0, lead: 0, other: 0 }
    for (const r of roleCounts) byRole[r.role] = r.count

    return { total: count, byRole, linkedToUsers: linked }
  })
}

void desc
