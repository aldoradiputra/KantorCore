import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { listTickets } from '../../../lib/helpdesk'
import { PortalShell } from '../PortalShell'
import PortalTicketForm from './PortalTicketForm'
import type { TicketStatus } from '../../../lib/helpdesk'

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'Baru', open: 'Terbuka', pending: 'Menunggu', resolved: 'Selesai', closed: 'Ditutup',
}

export default async function PortalSupportPage() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, allTickets] = await Promise.all([
    getTenantBranding(tenant.id),
    listTickets(tenant.id, {}),
  ])

  const myTickets = allTickets.filter((t) => t.contactId === contact.id)

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab={null}
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}>
        <section>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>
            Bantuan & Dukungan
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
            Ajukan pertanyaan atau laporkan masalah Anda.
          </p>
        </section>

        <PortalTicketForm />

        {myTickets.length > 0 && (
          <section>
            <h2 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 12px' }}>
              Tiket Saya
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {myTickets.map((t) => (
                <div key={t.id} style={{ padding: 'var(--s-3) var(--s-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{t.subject}</div>
                    <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{t.ticketNumber}</div>
                  </div>
                  <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  )
}
