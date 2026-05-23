import { eq, and, desc, sql, isNull, inArray } from 'drizzle-orm'
import { withTenant } from './db'
import {
  kmsSpaces,
  kmsArticles,
  kmsArticleVersions,
} from '@kantorcore/db'
import type {
  KmsSpace, NewKmsSpace,
  KmsArticle, NewKmsArticle,
  KmsArticleVersion,
  ArticleStatus, ArticleVisibility,
} from '@kantorcore/db'

export type { KmsSpace, KmsArticle, KmsArticleVersion, ArticleStatus, ArticleVisibility }

// ── Slug helper ───────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled'
}

// ── Spaces ────────────────────────────────────────────────────────────────────

export async function listSpaces(tenantId: string): Promise<KmsSpace[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(kmsSpaces).where(eq(kmsSpaces.tenantId, tenantId)).orderBy(kmsSpaces.name)
  })
}

export async function getSpace(tenantId: string, idOrSlug: string): Promise<KmsSpace | null> {
  return withTenant(tenantId, async (db) => {
    // Try by ID first, then by slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
    if (isUuid) {
      const [row] = await db.select().from(kmsSpaces)
        .where(and(eq(kmsSpaces.id, idOrSlug), eq(kmsSpaces.tenantId, tenantId)))
      return row ?? null
    }
    const [row] = await db.select().from(kmsSpaces)
      .where(and(eq(kmsSpaces.slug, idOrSlug), eq(kmsSpaces.tenantId, tenantId)))
    return row ?? null
  })
}

export async function createSpace(tenantId: string, data: Omit<NewKmsSpace, 'tenantId' | 'slug'> & { slug?: string }): Promise<KmsSpace> {
  return withTenant(tenantId, async (db) => {
    const slug = data.slug || slugify(data.name)
    const [row] = await db.insert(kmsSpaces).values({ ...data, tenantId, slug }).returning()
    return row!
  })
}

export async function updateSpace(tenantId: string, id: string, patch: Partial<NewKmsSpace>) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .update(kmsSpaces)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(kmsSpaces.id, id), eq(kmsSpaces.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

// ── Articles ──────────────────────────────────────────────────────────────────

export interface ArticleFilters {
  spaceId?: string
  status?: ArticleStatus
  visibility?: ArticleVisibility
  parentId?: string | null
  search?: string
  limit?: number
}

export async function listArticles(tenantId: string, filters: ArticleFilters = {}): Promise<KmsArticle[]> {
  return withTenant(tenantId, async (db) => {
    let rows = await db.select().from(kmsArticles)
      .where(
        filters.spaceId
          ? and(eq(kmsArticles.tenantId, tenantId), eq(kmsArticles.spaceId, filters.spaceId))
          : eq(kmsArticles.tenantId, tenantId),
      )
      .orderBy(kmsArticles.position, kmsArticles.title)
      .limit(filters.limit ?? 500)

    if (filters.status) rows = rows.filter((a) => a.status === filters.status)
    if (filters.visibility) rows = rows.filter((a) => a.visibility === filters.visibility)
    if (filters.parentId === null) rows = rows.filter((a) => a.parentId === null)
    else if (filters.parentId) rows = rows.filter((a) => a.parentId === filters.parentId)

    if (filters.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
      )
    }
    return rows
  })
}

export async function getArticle(tenantId: string, idOrSlug: string, spaceId?: string): Promise<KmsArticle | null> {
  return withTenant(tenantId, async (db) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
    if (isUuid) {
      const [row] = await db.select().from(kmsArticles)
        .where(and(eq(kmsArticles.id, idOrSlug), eq(kmsArticles.tenantId, tenantId)))
      return row ?? null
    }
    if (!spaceId) return null
    const [row] = await db.select().from(kmsArticles)
      .where(and(
        eq(kmsArticles.slug, idOrSlug),
        eq(kmsArticles.spaceId, spaceId),
        eq(kmsArticles.tenantId, tenantId),
      ))
    return row ?? null
  })
}

export async function createArticle(tenantId: string, data: Omit<NewKmsArticle, 'tenantId' | 'slug'> & { slug?: string }): Promise<KmsArticle> {
  return withTenant(tenantId, async (db) => {
    const slug = data.slug || slugify(data.title)
    const [row] = await db
      .insert(kmsArticles)
      .values({ ...data, tenantId, slug })
      .returning()
    return row!
  })
}

export async function updateArticle(tenantId: string, id: string, patch: Partial<NewKmsArticle> & { snapshot?: boolean; authorId?: string | null }) {
  return withTenant(tenantId, async (db) => {
    const { snapshot, ...rest } = patch as Record<string, unknown>

    // Snapshot current version before update if requested
    if (snapshot) {
      const [current] = await db.select().from(kmsArticles)
        .where(and(eq(kmsArticles.id, id), eq(kmsArticles.tenantId, tenantId)))
      if (current) {
        await db.insert(kmsArticleVersions).values({
          tenantId,
          articleId: id,
          title: current.title,
          body: current.body,
          authorId: (patch.authorId as string | null) ?? current.authorId,
        })
      }
    }

    // Auto-set publishedAt when transitioning to published
    const extra: Partial<KmsArticle> = {}
    if (rest.status === 'published') {
      extra.publishedAt = new Date()
    }

    const [row] = await db
      .update(kmsArticles)
      .set({ ...rest, ...extra, updatedAt: new Date() })
      .where(and(eq(kmsArticles.id, id), eq(kmsArticles.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

export async function deleteArticle(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    await db.delete(kmsArticles).where(and(eq(kmsArticles.id, id), eq(kmsArticles.tenantId, tenantId)))
  })
}

export async function incrementViewCount(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    await db
      .update(kmsArticles)
      .set({ viewCount: sql`${kmsArticles.viewCount} + 1` })
      .where(and(eq(kmsArticles.id, id), eq(kmsArticles.tenantId, tenantId)))
  })
}

export async function listVersions(tenantId: string, articleId: string): Promise<KmsArticleVersion[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(kmsArticleVersions)
      .where(and(eq(kmsArticleVersions.articleId, articleId), eq(kmsArticleVersions.tenantId, tenantId)))
      .orderBy(desc(kmsArticleVersions.createdAt))
  })
}

// ── Public/Portal-visible articles ─────────────────────────────────────────────

export async function listPublishedArticlesForPortal(tenantId: string, spaceId?: string): Promise<KmsArticle[]> {
  return withTenant(tenantId, async (db) => {
    const rows = await db.select().from(kmsArticles)
      .where(
        spaceId
          ? and(eq(kmsArticles.tenantId, tenantId), eq(kmsArticles.spaceId, spaceId), eq(kmsArticles.status, 'published'))
          : and(eq(kmsArticles.tenantId, tenantId), eq(kmsArticles.status, 'published')),
      )
      .orderBy(kmsArticles.position, kmsArticles.title)
    return rows.filter((a) => a.visibility === 'portal' || a.visibility === 'public')
  })
}
