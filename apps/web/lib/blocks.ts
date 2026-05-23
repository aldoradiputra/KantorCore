import 'server-only'
import { eq, and, asc } from 'drizzle-orm'
import { withTenant } from './db'
import { blocksLayouts, blocksBlocks } from '@kantorcore/db'
import type { BlocksLayout, NewBlocksLayout, BlocksBlock, NewBlocksBlock, BlockType } from '@kantorcore/db'

export type { BlocksLayout, BlocksBlock, BlockType }
export type { BlocksBlock as Block }

// ── Layouts ────────────────────────────────────────────────────────────────────

export async function getOrCreateLayout(tenantId: string, scope: string, label: string): Promise<BlocksLayout> {
  return withTenant(tenantId, async (db) => {
    const [existing] = await db.select().from(blocksLayouts)
      .where(and(eq(blocksLayouts.tenantId, tenantId), eq(blocksLayouts.scope, scope)))
    if (existing) return existing

    const [created] = await db.insert(blocksLayouts)
      .values({ tenantId, scope, label })
      .returning()
    return created!
  })
}

export async function getLayout(tenantId: string, scope: string): Promise<BlocksLayout | null> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.select().from(blocksLayouts)
      .where(and(eq(blocksLayouts.tenantId, tenantId), eq(blocksLayouts.scope, scope)))
    return row ?? null
  })
}

// ── Blocks ─────────────────────────────────────────────────────────────────────

export async function listBlocks(tenantId: string, layoutId: string): Promise<BlocksBlock[]> {
  return withTenant(tenantId, async (db) => {
    return db.select().from(blocksBlocks)
      .where(and(eq(blocksBlocks.layoutId, layoutId), eq(blocksBlocks.tenantId, tenantId)))
      .orderBy(asc(blocksBlocks.position))
  })
}

export async function createBlock(tenantId: string, data: Omit<NewBlocksBlock, 'tenantId'>): Promise<BlocksBlock> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.insert(blocksBlocks)
      .values({ ...data, tenantId })
      .returning()
    return row!
  })
}

export async function updateBlock(tenantId: string, id: string, patch: Partial<Pick<NewBlocksBlock, 'config' | 'visible' | 'position'>>): Promise<BlocksBlock | null> {
  return withTenant(tenantId, async (db) => {
    const [row] = await db.update(blocksBlocks)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(blocksBlocks.id, id), eq(blocksBlocks.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

export async function deleteBlock(tenantId: string, id: string): Promise<void> {
  return withTenant(tenantId, async (db) => {
    await db.delete(blocksBlocks).where(and(eq(blocksBlocks.id, id), eq(blocksBlocks.tenantId, tenantId)))
  })
}

export async function reorderBlocks(tenantId: string, layoutId: string, orderedIds: string[]): Promise<void> {
  return withTenant(tenantId, async (db) => {
    await Promise.all(
      orderedIds.map((id, position) =>
        db.update(blocksBlocks)
          .set({ position, updatedAt: new Date() })
          .where(and(eq(blocksBlocks.id, id), eq(blocksBlocks.tenantId, tenantId), eq(blocksBlocks.layoutId, layoutId)))
      )
    )
  })
}

// ── Layout + blocks in one call ─────────────────────────────────────────────────

export async function getLayoutWithBlocks(
  tenantId: string,
  scope: string,
  defaultLabel?: string,
): Promise<{ layout: BlocksLayout; blocks: BlocksBlock[] }> {
  const layout = defaultLabel
    ? await getOrCreateLayout(tenantId, scope, defaultLabel)
    : await getLayout(tenantId, scope)

  if (!layout) return { layout: null as unknown as BlocksLayout, blocks: [] }
  const blocks = await listBlocks(tenantId, layout.id)
  return { layout, blocks }
}
