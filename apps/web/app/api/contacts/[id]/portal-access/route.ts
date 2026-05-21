import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { withTenant } from '../../../../../lib/db'
import { contacts } from '@kantorcore/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { enabled } = await req.json()

  const updated = await withTenant(ctx.tenant.id, async (db) => {
    const [row] = await db
      .update(contacts)
      .set({ portalEnabled: !!enabled, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, ctx.tenant.id)))
      .returning()
    return row
  })

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ id: updated.id, portalEnabled: updated.portalEnabled })
}
