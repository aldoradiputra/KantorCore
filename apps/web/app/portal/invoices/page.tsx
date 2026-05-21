import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { getMyInvoices } from '../../../lib/portal-data'
import { PortalShell } from '../PortalShell'

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draf',
  confirmed: 'Terkirim',
  paid:      'Lunas',
  cancelled: 'Dibatalkan',
}

const STATUS_COLOR: Record<string, string> = {
  paid:      'var(--success)',
  confirmed: 'var(--fg-2)',
  draft:     'var(--fg-3)',
  cancelled: 'var(--fg-3)',
}

export default async function PortalInvoices() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, invoices] = await Promise.all([
    getTenantBranding(tenant.id),
    getMyInvoices(tenant.id, contact.id),
  ])

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab="invoices"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 20px' }}>
          Faktur Saya
        </h1>

        {invoices.length === 0 ? (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
            Belum ada faktur.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Nomor', 'Tanggal', 'Jatuh Tempo', 'Status'].map((h) => (
                  <th key={h} style={{ padding: 'var(--s-3)', textAlign: 'left', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--s-3)', fontWeight: 600, color: 'var(--fg-1)' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>{inv.date}</td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>{inv.dueDate}</td>
                  <td style={{ padding: 'var(--s-3)' }}>
                    <span style={{
                      font: '600 11px/1 var(--font-sans)',
                      color: STATUS_COLOR[inv.status] ?? 'var(--fg-3)',
                    }}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
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
