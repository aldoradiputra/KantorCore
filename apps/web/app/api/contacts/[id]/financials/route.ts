import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { upsertFinancialProfile, listBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../../../../../lib/contacts'

function str(v: unknown): string | null | undefined {
  if (v === null) return null
  if (typeof v === 'string') return v
  return undefined
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const banks = await listBankAccounts(ctx.tenant.id, id)
  return NextResponse.json({ banks })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const res = await upsertFinancialProfile(ctx.tenant.id, id, {
    salespersonId: str(body.salespersonId) ?? undefined,
    paymentTermsId: str(body.paymentTermsId) ?? undefined,
    paymentTermsLabel: str(body.paymentTermsLabel) ?? undefined,
    pricelistId: str(body.pricelistId) ?? undefined,
    pricelistLabel: str(body.pricelistLabel) ?? undefined,
    deliveryMethod: str(body.deliveryMethod) ?? undefined,
    buyerId: str(body.buyerId) ?? undefined,
    purchasePaymentTermsId: str(body.purchasePaymentTermsId) ?? undefined,
    purchasePaymentTermsLabel: str(body.purchasePaymentTermsLabel) ?? undefined,
    purchasePaymentMethod: str(body.purchasePaymentMethod) ?? undefined,
    receiptReminder: typeof body.receiptReminder === 'boolean' ? body.receiptReminder : undefined,
    supplierCurrency: str(body.supplierCurrency) ?? undefined,
    propertyAccountReceivableId: str(body.propertyAccountReceivableId) ?? undefined,
    propertyAccountReceivableLabel: str(body.propertyAccountReceivableLabel) ?? undefined,
    propertyAccountPayableId: str(body.propertyAccountPayableId) ?? undefined,
    propertyAccountPayableLabel: str(body.propertyAccountPayableLabel) ?? undefined,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ profile: res.profile })
}
