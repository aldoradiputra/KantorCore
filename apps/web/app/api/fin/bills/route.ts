import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listBills, createBill } from '../../../../lib/finance'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') as 'draft' | 'confirmed' | 'paid' | 'cancelled' | null
  const list = await listBills(ctx.tenant.id, status ? { status } : {})
  return NextResponse.json({ bills: list })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    vendorName?: string
    vendorRef?: string | null
    contactId?: string | null
    date?: string
    dueDate?: string
    notes?: string | null
    lines?: { description: string; quantity: number; unitPrice: number; accountId: string; taxIds?: string[] }[]
    displayTaxInline?: boolean
  } | null
  if (!body?.vendorName || !body.date || !body.dueDate || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Data tagihan tidak lengkap.' }, { status: 400 })
  }

  try {
    const bill = await createBill({
      tenantId: ctx.tenant.id,
      userId: session.user.id,
      vendorName: body.vendorName,
      vendorRef: body.vendorRef ?? null,
      contactId: typeof body.contactId === 'string' ? body.contactId : null,
      date: body.date,
      dueDate: body.dueDate,
      notes: body.notes ?? null,
      displayTaxInline: body.displayTaxInline ?? false,
      lines: body.lines,
    })
    return NextResponse.json({ id: bill.id, billNumber: bill.billNumber })
  } catch (err) {
    console.error('[POST /api/fin/bills]', err)
    return NextResponse.json({ error: 'Gagal membuat tagihan.' }, { status: 500 })
  }
}
