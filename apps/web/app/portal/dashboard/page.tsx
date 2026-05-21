import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { getMySalesOrders, getMyInvoices, getMyGiftCards } from '../../../lib/portal-data'
import { formatIDR } from '../../../lib/promotions'
import { PortalShell } from '../PortalShell'

export default async function PortalDashboard() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, orders, invoices, giftCards] = await Promise.all([
    getTenantBranding(tenant.id),
    getMySalesOrders(tenant.id, contact.id),
    getMyInvoices(tenant.id, contact.id),
    getMyGiftCards(tenant.id, contact.id),
  ])

  const openOrders = orders.filter((o) => o.status === 'quotation' || o.status === 'confirmed').length
  const unpaidInvoices = invoices.filter((i) => i.status === 'confirmed').length
  const totalGiftCardBalance = giftCards.reduce((s, g) => s + (g.balance ?? 0), 0)

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab="dashboard"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        <div>
          <h1 style={{ font: '600 24px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Selamat datang, {contact.name}
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Ringkasan aktivitas akun Anda dengan {tenant.name}.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-4)' }}>
          <StatCard label="Pesanan Berjalan"   value={String(openOrders)}    href="/portal/orders" />
          <StatCard label="Faktur Belum Lunas" value={String(unpaidInvoices)} href="/portal/invoices" />
          <StatCard label="Total Saldo Gift Card" value={formatIDR(totalGiftCardBalance)} href="/portal/gift-cards" />
        </div>

        {/* Recent orders preview */}
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
                    <div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                      {o.soNumber}
                    </div>
                    <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
                      {o.date}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
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
      </div>
    </PortalShell>
  )
}

const STATUS_LABEL: Record<string, string> = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} style={{
      display: 'block',
      padding: 'var(--s-4)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      textDecoration: 'none',
    }}>
      <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>
        {value}
      </div>
    </a>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: 'var(--s-6)',
      textAlign: 'center',
      font: '13px/1.5 var(--font-sans)',
      color: 'var(--fg-3)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--r-md)',
    }}>
      {text}
    </div>
  )
}
