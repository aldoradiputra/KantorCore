import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { getMyGiftCards } from '../../../lib/portal-data'
import { formatIDR } from '../../../lib/promotions'
import { PortalShell } from '../PortalShell'

export default async function PortalGiftCards() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, cards] = await Promise.all([
    getTenantBranding(tenant.id),
    getMyGiftCards(tenant.id, contact.id),
  ])

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab="gift-cards"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 20px' }}>
          Gift Card Saya
        </h1>

        {cards.length === 0 ? (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
            Anda belum memiliki gift card.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s-4)' }}>
            {cards.map((c) => {
              const today = new Date().toISOString().slice(0, 10)
              const expired = c.validTo ? c.validTo < today : false
              const empty = (c.balance ?? 0) <= 0
              const dead = expired || empty

              return (
                <div key={c.id} style={{
                  padding: 'var(--s-5)',
                  background: dead ? 'var(--bg)' : 'linear-gradient(135deg, var(--indigo), var(--indigo-hover))',
                  color: dead ? 'var(--fg-3)' : 'var(--white)',
                  borderRadius: 'var(--r-md)',
                  border: dead ? '1px solid var(--border)' : 'none',
                  opacity: dead ? 0.7 : 1,
                  position: 'relative',
                  minHeight: 160,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ font: '11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 6 }}>
                      Gift Card
                    </div>
                    <div style={{ font: '600 28px/1.1 var(--font-sans)' }}>
                      {c.balance != null ? formatIDR(c.balance) : '—'}
                    </div>
                    {c.initialBalance && c.balance !== c.initialBalance && (
                      <div style={{ font: '11px/1.4 var(--font-sans)', opacity: 0.7, marginTop: 4 }}>
                        dari {formatIDR(c.initialBalance)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ font: '13px/1 var(--font-mono)', letterSpacing: '0.15em', marginBottom: 6 }}>
                      {c.code}
                    </div>
                    {c.validTo && (
                      <div style={{ font: '11px/1.4 var(--font-sans)', opacity: 0.8 }}>
                        Berlaku hingga {c.validTo}
                        {expired && ' (kadaluarsa)'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PortalShell>
  )
}
