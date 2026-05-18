import 'server-only'
import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import {
  users,
  memberships,
  invites,
  membershipRole,
  type Invite,
  type Membership,
} from '@kantorcore/db'
import { hashPassword, verifyPassword } from '@kantorcore/auth'
import { getDb } from './db'

const INVITE_TTL_DAYS = 7

// ── Profile ───────────────────────────────────────────────────

export async function updateDisplayName(
  userId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const n = name.trim()
  if (!n) return { ok: false, error: 'Nama tidak boleh kosong.' }
  if (n.length > 255) return { ok: false, error: 'Nama terlalu panjang.' }
  await getDb().update(users).set({ name: n, updatedAt: new Date() }).where(eq(users.id, userId))
  return { ok: true }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) return { ok: false, error: 'Kata sandi baru minimal 8 karakter.' }
  const rows = await getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!rows[0]) return { ok: false, error: 'Pengguna tidak ditemukan.' }
  const valid = await verifyPassword(currentPassword, rows[0].passwordHash)
  if (!valid) return { ok: false, error: 'Kata sandi saat ini salah.' }
  const hash = await hashPassword(newPassword)
  await getDb().update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, userId))
  return { ok: true }
}

// ── Workspace ─────────────────────────────────────────────────

export async function updateWorkspaceName(
  tenantId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenants } = await import('@kantorcore/db')
  const n = name.trim()
  if (!n) return { ok: false, error: 'Nama ruang kerja tidak boleh kosong.' }
  if (n.length > 255) return { ok: false, error: 'Nama terlalu panjang.' }
  await getDb().update(tenants).set({ name: n }).where(eq(tenants.id, tenantId))
  return { ok: true }
}

// ── Members ───────────────────────────────────────────────────

export interface MemberRow {
  membership: Membership
  user: { id: string; name: string; email: string }
}

export async function listMembers(tenantId: string): Promise<MemberRow[]> {
  const rows = await getDb()
    .select({
      membership: memberships,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, tenantId))
    .orderBy(memberships.createdAt)
  return rows
}

export async function listPendingInvites(tenantId: string): Promise<Invite[]> {
  return getDb()
    .select()
    .from(invites)
    .where(and(eq(invites.tenantId, tenantId), isNull(invites.acceptedAt)))
    .orderBy(invites.createdAt)
}

export type InviteRole = (typeof membershipRole.enumValues)[number]

export async function createInvite(input: {
  tenantId: string
  invitedBy: string
  email: string
  role: InviteRole
}): Promise<{ ok: true; invite: Invite } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'Email tidak valid.' }

  // Check if already a member.
  const existing = await getDb()
    .select({ id: users.id })
    .from(users)
    .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.tenantId, input.tenantId)))
    .where(eq(users.email, email))
    .limit(1)
  if (existing.length > 0) return { ok: false, error: 'Pengguna sudah menjadi anggota.' }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Upsert: replace any existing pending invite for the same email in this tenant.
  const existing_invite = await getDb()
    .select({ id: invites.id })
    .from(invites)
    .where(and(eq(invites.tenantId, input.tenantId), eq(invites.email, email), isNull(invites.acceptedAt)))
    .limit(1)
  if (existing_invite.length > 0) {
    const [updated] = await getDb()
      .update(invites)
      .set({ token, role: input.role, expiresAt, invitedBy: input.invitedBy })
      .where(eq(invites.id, existing_invite[0].id))
      .returning()
    return { ok: true, invite: updated }
  }

  const [invite] = await getDb()
    .insert(invites)
    .values({ tenantId: input.tenantId, email, role: input.role, token, invitedBy: input.invitedBy, expiresAt })
    .returning()
  return { ok: true, invite }
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const rows = await getDb()
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1)
  return rows[0] ?? null
}

export async function acceptInvite(
  token: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invite = await getInviteByToken(token)
  if (!invite) return { ok: false, error: 'Undangan tidak ditemukan.' }
  if (invite.acceptedAt) return { ok: false, error: 'Undangan sudah digunakan.' }
  if (invite.expiresAt < new Date()) return { ok: false, error: 'Undangan sudah kedaluwarsa.' }

  const db = getDb()
  await db.insert(memberships).values({
    userId,
    tenantId: invite.tenantId,
    role: invite.role,
  }).onConflictDoNothing()

  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.token, token))
  return { ok: true }
}
