import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { deleteAccount, getAccount } from '../../../../../lib/email'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const acct = await getAccount(ctx.tenant.id, id)
  if (!acct) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })
  return NextResponse.json(acct)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await deleteAccount(ctx.tenant.id, id)
  return NextResponse.json({ ok: true })
}
