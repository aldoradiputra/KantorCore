import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { updateWorkspaceName } from '../../../../lib/settings'

export async function PATCH(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { membership, tenant } = result.ctx
  if (membership.role === 'member') {
    return NextResponse.json({ error: 'Hanya admin dan owner yang bisa mengubah pengaturan workspace.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Missing name.' }, { status: 400 })
  }
  const updated = await updateWorkspaceName(tenant.id, body.name)
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
