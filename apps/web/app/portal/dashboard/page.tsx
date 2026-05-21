import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { getMySalesOrders, getMyInvoices, getMyGiftCards } from '../../../lib/portal-data'
import { getLayoutWithBlocks } from '../../../lib/blocks'
import { PortalShell } from '../PortalShell'
import { PortalDashboardContent } from './PortalDashboardContent'

export default async function PortalDashboard() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, orders, invoices, giftCards, { blocks: dashboardBlocks }] = await Promise.all([
    getTenantBranding(tenant.id),
    getMySalesOrders(tenant.id, contact.id),
    getMyInvoices(tenant.id, contact.id),
    getMyGiftCards(tenant.id, contact.id),
    getLayoutWithBlocks(tenant.id, 'portal_dashboard'),
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
      <PortalDashboardContent
        contact={contact}
        tenantName={tenant.name}
        orders={orders}
        openOrders={openOrders}
        unpaidInvoices={unpaidInvoices}
        totalGiftCardBalance={totalGiftCardBalance}
        dashboardBlocks={dashboardBlocks}
      />
    </PortalShell>
  )
}
