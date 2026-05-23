import { cookies, headers } from 'next/headers'
import { createHash, randomBytes } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { getDb, withTenant } from './db'
import {
  portalMagicLinks,
  portalSessions,
  contacts,
  tenants,
} from '@kantorcore/db'
import type { Contact, Tenant } from '@kantorcore/db'

export const PORTAL_COOKIE = 'portal_session'
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000          // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000   // 30 days

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function randomToken(): string {
  return randomBytes(32).toString('base64url')
}

// ── Magic Link Issuance ───────────────────────────────────────────────────────

/**
 * Issue a magic link for a contact's email. Looks across all tenants — if a
 * contact with `portal_enabled = true` matches the email, returns the magic
 * link token. Returns null if no matching contact (to avoid email enumeration,
 * the caller should always show "if your email is registered, you'll receive a link").
 */
export async function issueMagicLink(email: string): Promise<{
  token: string
  contact: Contact
  tenant: Tenant
} | null> {
  const db = getDb()
  const trimmed = email.trim().toLowerCase()

  // Cross-tenant lookup
  const rows = await db
    .select({ contact: contacts, tenant: tenants })
    .from(contacts)
    .innerJoin(tenants, eq(tenants.id, contacts.tenantId))
    .where(and(eq(contacts.email, trimmed), eq(contacts.portalEnabled, true)))

  if (rows.length === 0) return null

  // Use the first match (typical case: contact email is unique system-wide
  // for portal-enabled contacts in practice)
  const { contact, tenant } = rows[0]!
  const token = randomToken()
  const tokenHash = sha256(token)

  await db.insert(portalMagicLinks).values({
    tenantId: tenant.id,
    contactId: contact.id,
    tokenHash,
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
  })

  return { token, contact, tenant }
}

// ── Magic Link Consumption ────────────────────────────────────────────────────

/**
 * Consume a magic link token and create a portal session. Returns the session
 * cookie value to set, plus the resolved contact + tenant.
 */
export async function consumeMagicLink(token: string): Promise<{
  sessionToken: string
  contact: Contact
  tenant: Tenant
} | null> {
  const db = getDb()
  const tokenHash = sha256(token)

  const [link] = await db
    .select()
    .from(portalMagicLinks)
    .where(eq(portalMagicLinks.tokenHash, tokenHash))

  if (!link) return null
  if (link.consumedAt) return null
  if (link.expiresAt < new Date()) return null

  // Mark consumed
  await db
    .update(portalMagicLinks)
    .set({ consumedAt: new Date() })
    .where(eq(portalMagicLinks.id, link.id))

  // Resolve contact + tenant
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, link.contactId))
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, link.tenantId))
  if (!contact || !tenant) return null

  // Issue session
  const sessionToken = randomToken()
  const hdrs = await headers()
  await db.insert(portalSessions).values({
    tenantId: tenant.id,
    contactId: contact.id,
    tokenHash: sha256(sessionToken),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: hdrs.get('user-agent')?.slice(0, 500) ?? null,
    ipAddress: hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  // Update last login
  await db
    .update(contacts)
    .set({ portalLastLogin: new Date() })
    .where(eq(contacts.id, contact.id))

  return { sessionToken, contact, tenant }
}

// ── Session Resolution ────────────────────────────────────────────────────────

export interface PortalContext {
  contact: Contact
  tenant: Tenant
}

/** Resolve the current portal session from the cookie, or null if none. */
export async function getCurrentPortalSession(): Promise<PortalContext | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(PORTAL_COOKIE)?.value
  if (!raw) return null

  const db = getDb()
  const tokenHash = sha256(raw)

  const [session] = await db
    .select()
    .from(portalSessions)
    .where(and(eq(portalSessions.tokenHash, tokenHash), gt(portalSessions.expiresAt, new Date())))

  if (!session) return null

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, session.contactId))
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, session.tenantId))
  if (!contact || !tenant) return null

  return { contact, tenant }
}

/** End a portal session — delete the row matching the cookie. */
export async function signOutPortal(): Promise<void> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(PORTAL_COOKIE)?.value
  if (!raw) return
  const db = getDb()
  await db.delete(portalSessions).where(eq(portalSessions.tokenHash, sha256(raw)))
}
