import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getProcessBySlug } from '../../../../lib/processes'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const result = await getProcessBySlug(ctx.tenant.id, slug)
  if (!result) return NextResponse.json({ error: 'Proses tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(result)
}
