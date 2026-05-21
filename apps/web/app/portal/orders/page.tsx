import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { getMySalesOrders } from '../../../lib/portal-data'
import { PortalShell } from '../PortalShell'

const STATUS_LABEL: Record<string, string> = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}

export default async function PortalOrders() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, orders] = await Promise.all([
    getTenantBranding(tenant.id),
    getMySalesOrders(tenant.id, contact.id),
  ])

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab="orders"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 20px' }}>
          Pesanan Saya
        </h1>

        {orders.length === 0 ? (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
            Belum ada pesanan.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Nomor', 'Tanggal', 'Status', 'Catatan'].map((h) => (
                  <th key={h} style={{ padding: 'var(--s-3)', textAlign: 'left', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--s-3)', fontWeight: 600, color: 'var(--fg-1)' }}>{o.soNumber}</td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>{o.date}</td>
                  <td style={{ padding: 'var(--s-3)' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: o.status === 'done' ? 'var(--teal-light)' : 'var(--bg)',
                      color: o.status === 'done' ? 'var(--success)' : 'var(--fg-2)',
                    }}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 12 }}>
                    {o.notes ? (o.notes.length > 60 ? o.notes.slice(0, 60) + '…' : o.notes) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalShell>
  )
}
