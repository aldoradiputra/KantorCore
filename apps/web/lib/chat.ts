import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { channels, messages, users, type Channel, type Message } from '@kantr/db'
import { getDb } from './db'

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,62}[a-z0-9])?$/

export function validateChannelSlug(slug: string): string | null {
  if (!slug) return 'Slug kanal wajib diisi.'
  if (slug.length < 2) return 'Slug minimal 2 karakter.'
  if (slug.length > 64) return 'Slug maksimal 64 karakter.'
  if (!SLUG_RE.test(slug)) {
    return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
  }
  return null
}

/** Lists every channel in the tenant. DM filtering layers in once we ship DMs. */
export async function listChannels(tenantId: string): Promise<Channel[]> {
  return getDb()
    .select()
    .from(channels)
    .where(eq(channels.tenantId, tenantId))
    .orderBy(asc(channels.createdAt))
}

export async function getChannelBySlug(
  tenantId: string,
  slug: string,
): Promise<Channel | null> {
  const rows = await getDb()
    .select()
    .from(channels)
    .where(and(eq(channels.tenantId, tenantId), eq(channels.slug, slug)))
    .limit(1)
  return rows[0] ?? null
}

export async function createChannel(input: {
  tenantId: string
  userId: string
  slug: string
  name: string
  description?: string
}): Promise<{ ok: true; channel: Channel } | { ok: false; error: string }> {
  const slug = input.slug.trim().toLowerCase()
  const name = input.name.trim()

  const slugError = validateChannelSlug(slug)
  if (slugError) return { ok: false, error: slugError }
  if (name.length < 2) return { ok: false, error: 'Nama kanal terlalu pendek.' }

  const db = getDb()
  const existing = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.tenantId, input.tenantId), eq(channels.slug, slug)))
    .limit(1)
  if (existing.length > 0) return { ok: false, error: 'Slug kanal sudah dipakai.' }

  const [channel] = await db
    .insert(channels)
    .values({
      tenantId: input.tenantId,
      slug,
      name,
      description: input.description?.trim() || null,
      createdBy: input.userId,
      kind: 'public',
    })
    .returning()
  return { ok: true, channel }
}

export interface MessageWithAuthor {
  message: Message
  author: { id: string; name: string; email: string }
}

export async function listMessages(input: {
  tenantId: string
  channelId: string
  limit?: number
}): Promise<MessageWithAuthor[]> {
  const rows = await getDb()
    .select({
      message: messages,
      author: { id: users.id, name: users.name, email: users.email },
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorId, users.id))
    .where(and(eq(messages.tenantId, input.tenantId), eq(messages.channelId, input.channelId)))
    .orderBy(asc(messages.createdAt))
    .limit(input.limit ?? 200)
  return rows
}

export async function sendMessage(input: {
  tenantId: string
  channelId: string
  authorId: string
  body: string
}): Promise<{ ok: true; message: Message } | { ok: false; error: string }> {
  const body = input.body.trim()
  if (!body) return { ok: false, error: 'Pesan kosong.' }
  if (body.length > 4000) return { ok: false, error: 'Pesan terlalu panjang (maks 4000 karakter).' }

  const db = getDb()

  // Defense in depth: verify the channel belongs to the tenant before writing.
  const channel = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.id, input.channelId), eq(channels.tenantId, input.tenantId)))
    .limit(1)
  if (channel.length === 0) return { ok: false, error: 'Kanal tidak ditemukan.' }

  const [message] = await db
    .insert(messages)
    .values({
      tenantId: input.tenantId,
      channelId: input.channelId,
      authorId: input.authorId,
      body,
    })
    .returning()
  return { ok: true, message }
}
