import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { seedDefaultTools } from '../../../../../lib/agent'

export async function POST() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const { membership } = result.ctx
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang boleh seed tool.' }, { status: 403 })
  }

  const inserted = await seedDefaultTools(result.ctx.tenant.id)
  return NextResponse.json({ inserted })
}
