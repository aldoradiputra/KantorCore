import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { MODEL_REGISTRY } from '../../../../lib/platform/models'

export const runtime = 'nodejs'

/**
 * GET /api/platform/schema
 *
 * Returns a compact list of all registered entities for the agent to
 * discover what exists in the system. For full metadata of one entity,
 * call /api/platform/schema/[entity].
 */
export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const entities = Object.values(MODEL_REGISTRY).map((m) => ({
    entity: m.entity,
    module: m.module,
    label: m.label,
    pluralLabel: m.pluralLabel,
    displayField: m.displayField,
    chatter: m.chatter ?? false,
    activities: m.activities ?? false,
    fieldCount: Object.keys(m.fields).length,
  }))

  return NextResponse.json({
    count: entities.length,
    entities,
  })
}
