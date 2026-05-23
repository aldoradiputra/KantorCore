'use client'

import type { BlocksBlock } from '../../../lib/blocks'
import { BlockRenderer } from '../../../components/blocks'
import { formatIDR } from '../../../lib/promotions-shared'

type Order = {
  id: string
  soNumber: string
  date: string | null
  status: string
}

type Contact = {
  id: string
  name: string
  email: string | null
  [key: string]: unknown
}

const STATUS_LABEL: Record<string, string> = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}

export function PortalDashboardContent({
  contact,
  tenantName,
  orders,
  openOrders,
  unpaidInvoices,
  totalGiftCardBalance,
  dashboardBlocks,
}: {
  contact: Contact
  tenantName: string
  orders: Order[]
  openOrders: number
  unpaidInvoices: number
  totalGiftCardBalance: number
  dashboardBlocks: BlocksBlock[]
}) {
  // Build field context for field-type blocks
  const fieldContext: Record<string, string | null> = {
    'contact.name':  contact.name,
    'contact.email': contact.email,
    'tenant.name':   tenantName,
  }

  // When tenant has custom blocks, render those. Otherwise, render default layout.
  const hasBlocks = dashboardBlocks.filter((b) => b.visible).length > 0

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      {/* Always show welcome + stats */}
      <div>
        <h1 style={{ font: '600 24px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Selamat datang, {contact.name}
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
          Ringkasan aktivitas akun Anda dengan {tenantName}.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-4)' }}>
        <StatCard label="Pesanan Berjalan"   value={String(openOrders)}    href="/portal/orders" />
        <StatCard label="Faktur Belum Lunas" value={String(unpaidInvoices)} href="/portal/invoices" />
        <StatCard label="Total Saldo Gift Card" value={formatIDR(totalGiftCardBalance)} href="/portal/gift-cards" />
      </div>

      {/* Custom blocks from tenant layout */}
      {hasBlocks && (
        <BlockRenderer blocks={dashboardBlocks} context={{ fields: fieldContext }} />
      )}

      {/* Default: recent orders (shown when no custom blocks or fallback) */}
      {!hasBlocks && (
        <section>
          <h2 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 12px' }}>
            Pesanan Terbaru
          </h2>
          {orders.length === 0 ? (
            <EmptyState text="Belum ada pesanan." />
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} style={{
                  padding: 'var(--s-3) var(--s-4)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{o.soNumber}</div>
                    <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{o.date}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: o.status === 'done' ? 'var(--teal-light)' : 'var(--bg)',
                    color: o.status === 'done' ? 'var(--success)' : 'var(--fg-2)',
                  }}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} style={{
      display: 'block', padding: 'var(--s-4)', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 'var(--r-md)', textDecoration: 'none',
    }}>
      <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</div>
    </a>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: 'var(--s-6)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
      {text}
    </div>
  )
}
