import { requireAuthedContext } from '../../../../lib/requireSession'
import { getAnthropic } from '../../../../lib/anthropic'
import { listContacts } from '../../../../lib/contacts'
import { listDeals } from '../../../../lib/crm'
import { listPOs } from '../../../../lib/procurement'
import { listSOs } from '../../../../lib/sales'
import { listInvoices, listBills, formatIDR } from '../../../../lib/finance'
import { listDocuments } from '../../../../lib/documents'
import { listProducts } from '../../../../lib/products'

export const runtime = 'nodejs'

function brief<T extends object>(items: T[], limit = 20): T[] {
  return items.slice(0, limit)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json().catch(() => ({}))
  const query: string = (body.query ?? '').trim()
  if (!query) return new Response('Query wajib diisi.', { status: 400 })

  // Fetch a cross-module snapshot in parallel (best-effort, errors ignored)
  const [contacts, deals, pos, sos, invoices, bills, docs, productRows] = await Promise.all([
    listContacts(ctx.tenant.id).catch(() => []),
    listDeals(ctx.tenant.id).catch(() => []),
    listPOs(ctx.tenant.id).catch(() => []),
    listSOs(ctx.tenant.id).catch(() => []),
    listInvoices(ctx.tenant.id).catch(() => []),
    listBills(ctx.tenant.id).catch(() => []),
    listDocuments(ctx.tenant.id).catch(() => []),
    listProducts(ctx.tenant.id, { activeOnly: true }).catch(() => []),
  ])

  const snapshot = {
    contacts: brief(contacts.map((c) => ({
      name: c.contact.name,
      email: c.contact.email,
      roles: c.roles,
    }))),
    deals: brief(deals.map((d) => ({
      number: d.dealNumber,
      title: d.title,
      stage: d.stage,
      contact: d.contactName,
      value: d.expectedValue,
      close: d.expectedClose,
    }))),
    purchaseOrders: brief(pos.map((p) => ({
      number: p.poNumber,
      vendor: p.vendorName,
      status: p.status,
      date: p.date,
    }))),
    salesOrders: brief(sos.map((s) => ({
      number: s.soNumber,
      customer: s.customerName,
      status: s.status,
      date: s.date,
    }))),
    invoices: brief(invoices.map((i) => ({
      number: i.invoiceNumber,
      customer: i.customerName,
      status: i.status,
      total: i.total,
      due: i.dueDate,
    }))),
    bills: brief(bills.map((b) => ({
      number: b.billNumber,
      vendor: b.vendorName,
      status: b.status,
      total: b.total,
      due: b.dueDate,
    }))),
    documents: brief(docs.map((d) => ({
      number: d.doc.docNumber,
      title: d.doc.title,
      type: d.doc.type,
      status: d.doc.status,
      party: d.contactName ?? d.doc.partyName,
      expiry: d.doc.expiryDate,
    }))),
    products: brief(productRows.map((p) => ({
      code: p.product.code,
      name: p.product.name,
      type: p.product.type,
      salePrice: p.product.salePrice,
      costPrice: p.product.costPrice,
    }))),
  }

  const systemPrompt = `You are the AI assistant for Indonesia System (KantorCore), an ERP platform.
You have access to a live snapshot of this workspace's data. Answer the user's question using the data below.
Be concise and use Indonesian language. Format numbers as currency (Rp X.XXX) when relevant.
If you can't find specific data, say so clearly. Never make up data not in the snapshot.

Today: ${new Date().toISOString().slice(0, 10)}
Workspace: ${ctx.tenant.name}

=== WORKSPACE DATA SNAPSHOT ===
${JSON.stringify(snapshot, null, 2)}
=== END SNAPSHOT ===`

  const anthropic = getAnthropic()

  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
