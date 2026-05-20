import 'server-only'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  contacts,
  contactRoles,
  users,
  type Contact,
  type ContactRole,
  type ContactType,
} from '@kantorcore/db'
import { withTenant } from './db'

export interface ContactRow {
  contact: Contact
  roles: ContactRole[]
  linkedUser: { id: string; name: string; email: string } | null
}

export async function listContacts(
  tenantId: string,
  filters: { search?: string; role?: ContactRole } = {},
): Promise<ContactRow[]> {
  return withTenant(tenantId, async (tx) => {
    let whereCond = eq(contacts.tenantId, tenantId)
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
    const roleRows =
      contactIds.length > 0
        ? await tx
            .select()
            .from(contactRoles)
            .where(and(eq(contactRoles.tenantId, tenantId), sql`${contactRoles.contactId} = ANY(${contactIds})`))
        : []

    const filtered = filters.role
      ? rows.filter((r) => roleRows.some((rr) => rr.contactId === r.contact.id && rr.role === filters.role))
      : rows

    return filtered.map((r) => ({
      contact: r.contact,
      roles: roleRows.filter((rr) => rr.contactId === r.contact.id).map((rr) => rr.role),
      linkedUser:
        r.linkedUserId && r.linkedUserName && r.linkedUserEmail
          ? { id: r.linkedUserId, name: r.linkedUserName, email: r.linkedUserEmail }
          : null,
    }))
  })
}

export async function getContact(tenantId: string, contactId: string): Promise<ContactRow | null> {
  const rows = await listContacts(tenantId)
  return rows.find((r) => r.contact.id === contactId) ?? null
}

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
}

export async function createContact(
  tenantId: string,
  input: ContactInput,
): Promise<{ ok: true; contact: Contact } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name || name.length < 2) return { ok: false, error: 'Nama wajib diisi minimal 2 karakter.' }
  const email = input.email?.trim().toLowerCase() || null

  return withTenant(tenantId, async (tx) => {
    if (email) {
      const conflict = await tx
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, email)))
        .limit(1)
      if (conflict.length > 0) return { ok: false, error: 'Email ini sudah dipakai oleh kontak lain.' }
    }

    const [contact] = await tx
      .insert(contacts)
      .values({
        tenantId,
        type: input.type,
        name,
        email,
        phone: input.phone?.trim() || null,
        npwp: input.npwp?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        userId: input.userId || null,
      })
      .returning()

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
  return withTenant(tenantId, async (tx) => {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (input.type !== undefined) patch.type = input.type
    if (input.name !== undefined) {
      const n = input.name.trim()
      if (n.length < 2) return { ok: false, error: 'Nama minimal 2 karakter.' }
      patch.name = n
    }
    if (input.email !== undefined) {
      const e = input.email?.trim().toLowerCase() || null
      if (e) {
        const conflict = await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, e)))
          .limit(1)
        if (conflict.length > 0 && conflict[0]!.id !== contactId) {
          return { ok: false, error: 'Email ini sudah dipakai oleh kontak lain.' }
        }
      }
      patch.email = e
    }
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
    if (input.npwp !== undefined) patch.npwp = input.npwp?.trim() || null
    if (input.address !== undefined) patch.address = input.address?.trim() || null
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null
    if (input.userId !== undefined) patch.userId = input.userId || null

    const [contact] = await tx
      .update(contacts)
      .set(patch)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .returning()

    if (!contact) return { ok: false, error: 'Kontak tidak ditemukan.' }

    if (input.roles !== undefined) {
      await tx
        .delete(contactRoles)
        .where(and(eq(contactRoles.contactId, contactId), eq(contactRoles.tenantId, tenantId)))
      if (input.roles.length > 0) {
        await tx.insert(contactRoles).values(
          input.roles.map((role) => ({ contactId, tenantId, role })),
        )
      }
    }

    return { ok: true, contact }
  })
}

export async function deleteContact(tenantId: string, contactId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.delete(contacts).where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId))),
  )
}

export interface ContactStats {
  total: number
  byRole: Record<ContactRole, number>
  linkedToUsers: number
}

export async function getContactStats(tenantId: string): Promise<ContactStats> {
  return withTenant(tenantId, async (tx) => {
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(eq(contacts.tenantId, tenantId))

    const roleCounts = await tx
      .select({ role: contactRoles.role, count: sql<number>`count(*)::int` })
      .from(contactRoles)
      .where(eq(contactRoles.tenantId, tenantId))
      .groupBy(contactRoles.role)

    const [{ linked }] = await tx
      .select({ linked: sql<number>`count(*)::int` })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), sql`${contacts.userId} IS NOT NULL`))

    const byRole: Record<ContactRole, number> = {
      staff: 0, customer: 0, vendor: 0, lead: 0, other: 0,
    }
    for (const r of roleCounts) byRole[r.role] = r.count

    return { total: count, byRole, linkedToUsers: linked }
  })
}

/**
 * Suppress unused-import warnings while ContactRow detail view ships in
 * Phase 32 follow-up (per-contact transaction history).
 */
void desc
