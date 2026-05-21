'use client'

import { BlockEditor } from '../../../../components/blocks'
import type { BlocksBlock, BlockType } from '../../../../lib/blocks'

export function LayoutEditorClient({
  scope,
  layoutId,
  initialBlocks,
}: {
  scope: string
  layoutId: string
  initialBlocks: BlocksBlock[]
}) {
  async function handleSave(blocks: Array<{ id?: string; type: BlockType; position: number; config: Record<string, unknown>; visible: boolean }>) {
    const res = await fetch(`/api/blocks/layouts/${encodeURIComponent(scope)}/blocks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? 'Gagal menyimpan layout.')
    }
  }

  return <BlockEditor layoutId={layoutId} initialBlocks={initialBlocks} onSave={handleSave} />
}
