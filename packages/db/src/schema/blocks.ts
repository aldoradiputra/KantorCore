import {
  pgSchema,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const blocksSchema = pgSchema('blocks')

export const blockType = pgEnum('block_type', [
  'text',
  'heading',
  'image',
  'cta_button',
  'divider',
  'articles_list',
  'tickets_list',
  'gift_cards_grid',
  'field',
  'custom_html',
])

export type BlockType = (typeof blockType.enumValues)[number]

// ── Layouts ────────────────────────────────────────────────────────────────────

export const blocksLayouts = blocksSchema.table('layouts', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  scope:     text('scope').notNull(),
  label:     text('label').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantScopeUniq: unique('blocks_layouts_tenant_scope').on(t.tenantId, t.scope),
  tenantIdx:       index('blocks_layouts_tenant_idx').on(t.tenantId),
}))

export type BlocksLayout = typeof blocksLayouts.$inferSelect
export type NewBlocksLayout = typeof blocksLayouts.$inferInsert

// ── Blocks ─────────────────────────────────────────────────────────────────────

export const blocksBlocks = blocksSchema.table('blocks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  layoutId:  uuid('layout_id').notNull(),
  type:      blockType('type').notNull(),
  position:  integer('position').notNull().default(0),
  config:    jsonb('config').notNull().default({}),
  visible:   boolean('visible').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  layoutIdx: index('blocks_blocks_layout_idx').on(t.layoutId, t.position),
  tenantIdx: index('blocks_blocks_tenant_idx').on(t.tenantId),
}))

export type BlocksBlock = typeof blocksBlocks.$inferSelect
export type NewBlocksBlock = typeof blocksBlocks.$inferInsert

// ── Block config type map ──────────────────────────────────────────────────────
// Each block type has a strongly-typed config. This is a discriminated union.

export type TextBlockConfig = {
  content: string            // plain text or markdown
  bodyJson?: unknown         // TipTap JSON (if rich)
}

export type HeadingBlockConfig = {
  text: string
  level: 1 | 2 | 3
  align?: 'left' | 'center' | 'right'
}

export type ImageBlockConfig = {
  url: string
  alt?: string
  caption?: string
  width?: number
  height?: number
  rounded?: boolean
}

export type CtaButtonBlockConfig = {
  label: string
  href: string
  style?: 'primary' | 'secondary' | 'ghost'
  align?: 'left' | 'center' | 'right'
  openInNewTab?: boolean
}

export type DividerBlockConfig = {
  style?: 'solid' | 'dashed' | 'dotted'
  margin?: number
}

export type ArticlesListBlockConfig = {
  spaceId?: string           // null = all portal-visible spaces
  limit?: number
  showExcerpt?: boolean
}

export type TicketsListBlockConfig = {
  statusFilter?: string[]    // e.g. ['open', 'pending']
  limit?: number
}

export type GiftCardsGridBlockConfig = {
  limit?: number
}

export type FieldBlockConfig = {
  entity: 'contact' | 'tenant'
  field: string              // e.g. 'name', 'phone', 'membership_tier'
  label?: string
  format?: 'text' | 'date' | 'currency' | 'badge'
}

export type CustomHtmlBlockConfig = {
  html: string
}

export type AnyBlockConfig =
  | TextBlockConfig
  | HeadingBlockConfig
  | ImageBlockConfig
  | CtaButtonBlockConfig
  | DividerBlockConfig
  | ArticlesListBlockConfig
  | TicketsListBlockConfig
  | GiftCardsGridBlockConfig
  | FieldBlockConfig
  | CustomHtmlBlockConfig

// Helper to cast config with the correct type
export function blockConfig<T extends AnyBlockConfig>(block: BlocksBlock): T {
  return block.config as T
}
