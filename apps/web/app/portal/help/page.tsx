import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../lib/portal-auth'
import { getTenantBranding } from '../../../lib/branding'
import { listSpaces, listPublishedArticlesForPortal } from '../../../lib/kms'
import { PortalShell } from '../PortalShell'

export default async function PortalHelpHome() {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const [branding, spaces, articles] = await Promise.all([
    getTenantBranding(tenant.id),
    listSpaces(tenant.id),
    listPublishedArticlesForPortal(tenant.id),
  ])

  // Filter to portal-visible spaces only
  const portalSpaces = spaces.filter(
    (s) => s.visibility === 'portal' || s.visibility === 'public',
  )

  const articlesBySpace: Record<string, number> = {}
  for (const a of articles) articlesBySpace[a.spaceId] = (articlesBySpace[a.spaceId] ?? 0) + 1

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab={null}
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ font: '600 24px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>
          Pusat Bantuan
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '0 0 32px' }}>
          Panduan dan jawaban untuk pertanyaan umum.
        </p>

        {portalSpaces.length === 0 ? (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
            Belum ada artikel bantuan yang tersedia.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s-4)' }}>
            {portalSpaces.map((s) => (
              <Link
                key={s.id}
                href={`/portal/help/${s.slug}`}
                style={{
                  padding: 'var(--s-5)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 32 }}>{s.icon || '📚'}</span>
                <div style={{ font: '600 16px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {s.name}
                </div>
                {s.description && (
                  <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {s.description}
                  </div>
                )}
                <div style={{ marginTop: 'auto', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                  {articlesBySpace[s.id] ?? 0} artikel
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  )
}
