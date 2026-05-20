import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listInvoices, createInvoice } from '../../../../lib/finance'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') as 'draft' | 'confirmed' | 'paid' | 'cancelled' | null
  const list = await listInvoices(ctx.tenant.id, status ? { status } : {})
  return NextResponse.json({ invoices: list })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    customerName?: string
    customerEmail?: string | null
    date?: string
    dueDate?: string
    notes?: string | null
    lines?: { description: string; quantity: number; unitPrice: number; accountId: string; taxIds?: string[] }[]
    displayTaxInline?: boolean
  } | null
  if (!body?.customerName || !body.date || !body.dueDate || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Data faktur tidak lengkap.' }, { status: 400 })
  }

  try {
    const inv = await createInvoice({
      tenantId: ctx.tenant.id,
      userId: session.user.id,
      customerName: body.customerName,
      customerEmail: body.customerEmail ?? null,
      date: body.date,
      dueDate: body.dueDate,
      notes: body.notes ?? null,
      displayTaxInline: body.displayTaxInline ?? false,
      lines: body.lines,
    })
    return NextResponse.json({ id: inv.id, invoiceNumber: inv.invoiceNumber })
  } catch (err) {
    console.error('[POST /api/fin/invoices]', err)
    return NextResponse.json({ error: 'Gagal membuat faktur.' }, { status: 500 })
  }
}
