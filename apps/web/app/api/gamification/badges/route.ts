import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listBadges, createBadge } from '../../../../lib/gamification'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const list = await listBadges(ctx.tenant.id)
  return NextResponse.json({ badges: list })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'Nama badge wajib diisi.' }, { status: 400 })

  const res = await createBadge({
    tenantId:    ctx.tenant.id,
    userId:      ctx.session.user.id,
    name:        body.name,
    icon:        body.icon ?? '🏆',
    color:       body.color ?? '#3B4FC4',
    description: body.description ?? null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ badge: res.badge }, { status: 201 })
}
