import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { createBankAccount, listBankAccounts } from '../../../../../lib/contacts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const banks = await listBankAccounts(ctx.tenant.id, id)
  return NextResponse.json({ banks })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body || typeof body.accountNumber !== 'string' || !body.accountNumber.trim()) {
    return NextResponse.json({ error: 'accountNumber wajib diisi.' }, { status: 400 })
  }

  const bank = await createBankAccount(ctx.tenant.id, id, {
    accountNumber: body.accountNumber,
    bankName: typeof body.bankName === 'string' ? body.bankName : null,
    branch: typeof body.branch === 'string' ? body.branch : null,
    routingNumber: typeof body.routingNumber === 'string' ? body.routingNumber : null,
  })

  return NextResponse.json({ bank }, { status: 201 })
}
