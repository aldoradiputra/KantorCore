import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getModel } from '../../../../../lib/platform/models'

export const runtime = 'nodejs'

/**
 * GET /api/platform/schema/[entity]
 *
 * Returns the full ModelMeta for one entity (fields, views, perms, etc.)
 * plus a derived `searchFields` list for convenience. The agent uses this
 * to understand the shape of an entity before reading or writing data.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const { entity } = await params
  const model = getModel(entity)
  if (!model) {
    return NextResponse.json({ error: `Entitas '${entity}' tidak ditemukan.` }, { status: 404 })
  }

  // Derive searchable field names for convenience
  const searchFields = Object.values(model.fields)
    .filter((f) => f.searchable)
    .map((f) => f.name)

  return NextResponse.json({
    ...model,
    searchFields,
  })
}
