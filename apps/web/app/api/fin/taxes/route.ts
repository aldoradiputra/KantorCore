import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listTaxes, createTax } from '../../../../lib/finance'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') as 'sale' | 'purchase' | null
  const activeOnly = url.searchParams.get('active') === '1'
  const taxes = await listTaxes(ctx.tenant.id, { scope: scope ?? undefined, activeOnly })
  return NextResponse.json({ taxes })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    name?: string
    scope?: 'sale' | 'purchase'
    amountType?: 'percent' | 'fixed'
    amount?: number
    taxAccountId?: string
    groupId?: string | null
    priceInclude?: boolean
    description?: string | null
  } | null
  if (!body?.name || !body.scope || typeof body.amount !== 'number' || !body.taxAccountId) {
    return NextResponse.json({ error: 'Field wajib: name, scope, amount, taxAccountId.' }, { status: 400 })
  }

  try {
    const tax = await createTax({
      tenantId: ctx.tenant.id,
      name: body.name,
      scope: body.scope,
      amountType: body.amountType ?? 'percent',
      amount: body.amount,
      taxAccountId: body.taxAccountId,
      groupId: body.groupId ?? null,
      priceInclude: body.priceInclude ?? false,
      description: body.description ?? null,
    })
    return NextResponse.json({ id: tax.id })
  } catch (err) {
    console.error('[POST /api/fin/taxes]', err)
    return NextResponse.json({ error: 'Gagal membuat pajak (mungkin nama duplikat).' }, { status: 500 })
  }
}
