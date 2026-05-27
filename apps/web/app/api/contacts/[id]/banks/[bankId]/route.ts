import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { updateBankAccount, deleteBankAccount } from '../../../../../../lib/contacts'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; bankId: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { bankId } = await params

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const bank = await updateBankAccount(ctx.tenant.id, bankId, {
    accountNumber: typeof body.accountNumber === 'string' ? body.accountNumber : undefined,
    bankName: body.bankName === null ? null : typeof body.bankName === 'string' ? body.bankName : undefined,
    branch: body.branch === null ? null : typeof body.branch === 'string' ? body.branch : undefined,
    routingNumber: body.routingNumber === null ? null : typeof body.routingNumber === 'string' ? body.routingNumber : undefined,
  })

  if (!bank) return NextResponse.json({ error: 'Rekening tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ bank })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; bankId: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { bankId } = await params
  await deleteBankAccount(ctx.tenant.id, bankId)
  return NextResponse.json({ ok: true })
}
