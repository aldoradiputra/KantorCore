import {
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const kmsSchema = pgSchema('kms')

export const articleStatus = pgEnum('article_status', ['draft', 'published', 'archived'])
export const articleVisibility = pgEnum('article_visibility', ['internal', 'portal', 'public'])

// ── Spaces ─────────────────────────────────────────────────────────────────────

export const kmsSpaces = kmsSchema.table('spaces', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  slug:        text('slug').notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  icon:        text('icon'),
  visibility:  articleVisibility('visibility').notNull().default('internal'),
  createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantSlugUniq: unique('kms_spaces_tenant_slug').on(t.tenantId, t.slug),
  tenantIdx:      index('kms_spaces_tenant_idx').on(t.tenantId),
}))

export type KmsSpace = typeof kmsSpaces.$inferSelect
export type NewKmsSpace = typeof kmsSpaces.$inferInsert
export type ArticleStatus = (typeof articleStatus.enumValues)[number]
export type ArticleVisibility = (typeof articleVisibility.enumValues)[number]

// ── Articles ──────────────────────────────────────────────────────────────────

export const kmsArticles = kmsSchema.table('articles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  spaceId:     uuid('space_id').notNull().references(() => kmsSpaces.id, { onDelete: 'cascade' }),
  parentId:    uuid('parent_id'),
  slug:        text('slug').notNull(),
  title:       text('title').notNull(),
  body:        text('body').notNull().default(''),
  excerpt:     text('excerpt'),
  status:      articleStatus('status').notNull().default('draft'),
  visibility:  articleVisibility('visibility').notNull().default('internal'),
  tags:        text('tags').array().notNull().default([]),
  viewCount:   integer('view_count').notNull().default(0),
  position:    integer('position').notNull().default(0),
  authorId:    uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  spaceSlugUniq:    unique('kms_articles_space_slug').on(t.spaceId, t.slug),
  tenantIdx:        index('kms_articles_tenant_idx').on(t.tenantId),
  spaceIdx:         index('kms_articles_space_idx').on(t.spaceId),
  tenantStatusIdx:  index('kms_articles_tenant_status').on(t.tenantId, t.status),
}))

export type KmsArticle = typeof kmsArticles.$inferSelect
export type NewKmsArticle = typeof kmsArticles.$inferInsert

// ── Versions ──────────────────────────────────────────────────────────────────

export const kmsArticleVersions = kmsSchema.table('article_versions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id').notNull().references(() => kmsArticles.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  authorId:  uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  articleIdx: index('kms_versions_article_idx').on(t.articleId),
}))

export type KmsArticleVersion = typeof kmsArticleVersions.$inferSelect
