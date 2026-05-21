import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import {
  getOrCreateLayout,
  listBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
} from '../../../../../../lib/blocks'
import type { BlockType } from '../../../../../../lib/blocks'

export async function PUT(req: Request, { params }: { params: Promise<{ scope: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { scope } = await params
  const body = await req.json()
  // Expect: { blocks: Array<{ id?, type, position, config, visible }> }
  const incoming = body.blocks as Array<{ id?: string; type: BlockType; position: number; config: Record<string, unknown>; visible: boolean }>
  if (!Array.isArray(incoming)) return NextResponse.json({ error: 'blocks array required' }, { status: 400 })

  const layout = await getOrCreateLayout(ctx.tenant.id, scope, scope)

  // Get existing blocks to determine what to create/update/delete
  const existing = await listBlocks(ctx.tenant.id, layout.id)
  const existingIds = new Set(existing.map((b) => b.id))
  const incomingIds = new Set(incoming.filter((b) => b.id).map((b) => b.id!))

  // Delete removed blocks
  await Promise.all(
    existing
      .filter((b) => !incomingIds.has(b.id))
      .map((b) => deleteBlock(ctx.tenant.id, b.id))
  )

  // Upsert
  await Promise.all(
    incoming.map(async (b) => {
      if (b.id && existingIds.has(b.id)) {
        await updateBlock(ctx.tenant.id, b.id, { config: b.config, visible: b.visible, position: b.position })
      } else {
        await createBlock(ctx.tenant.id, {
          layoutId: layout.id,
          type: b.type,
          position: b.position,
          config: b.config,
          visible: b.visible,
        })
      }
    })
  )

  const updated = await listBlocks(ctx.tenant.id, layout.id)
  return NextResponse.json({ layout, blocks: updated })
}
