import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listEmailAliases, createEmailAlias } from '../../../../lib/helpdesk'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const aliases = await listEmailAliases(ctx.tenant.id)
  return NextResponse.json(aliases)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { alias, teamId } = await req.json()
  if (!alias?.trim()) return NextResponse.json({ error: 'Alias diperlukan.' }, { status: 400 })

  const row = await createEmailAlias(ctx.tenant.id, alias.trim().toLowerCase(), teamId ?? null)
  return NextResponse.json(row, { status: 201 })
}
