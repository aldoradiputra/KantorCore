import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../../../lib/portal-auth'
import { getTenantBranding } from '../../../../lib/branding'
import { getSpace, listPublishedArticlesForPortal, getArticle, incrementViewCount } from '../../../../lib/kms'
import { PortalShell } from '../../PortalShell'

export default async function PortalSpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ article?: string }>
}) {
  const session = await getCurrentPortalSession()
  if (!session) redirect('/portal/sign-in')

  const { contact, tenant } = session
  const { slug } = await params
  const { article: articleSlug } = await searchParams

  const [branding, space] = await Promise.all([
    getTenantBranding(tenant.id),
    getSpace(tenant.id, slug),
  ])

  if (!space || (space.visibility !== 'portal' && space.visibility !== 'public')) {
    redirect('/portal/help')
  }

  const articles = await listPublishedArticlesForPortal(tenant.id, space.id)
  const selected = articleSlug ? articles.find((a) => a.slug === articleSlug) : null
  if (selected) await incrementViewCount(tenant.id, selected.id)

  return (
    <PortalShell
      tenantName={tenant.name}
      tenantLogoUrl={branding.logoUrl}
      contactName={contact.name}
      brandColor={branding.brandColor}
      activeTab={null}
    >
      <div style={{ display: 'flex', height: '100%', maxWidth: 1200, margin: '0 auto' }}>
        {/* Sidebar */}
        <aside style={{
          width: 260,
          padding: 'var(--s-5) var(--s-4)',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <Link href="/portal/help" style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
            ← Semua kategori
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>{space.icon || '📚'}</span>
            <span style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{space.name}</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {articles.map((a) => {
              const active = selected?.id === a.id
              return (
                <Link
                  key={a.id}
                  href={`/portal/help/${space.slug}?article=${a.slug}`}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--r-sm)',
                    font: `${active ? '600' : '500'} 13px/1.4 var(--font-sans)`,
                    color: active ? 'var(--indigo)' : 'var(--fg-2)',
                    background: active ? 'var(--indigo-light)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {a.title}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Article */}
        <div style={{ flex: 1, padding: 'var(--s-6)', overflowY: 'auto' }}>
          {selected ? (
            <article style={{ maxWidth: 720 }}>
              <h1 style={{ font: '700 28px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 24px' }}>
                {selected.title}
              </h1>
              <div style={{ font: '15px/1.7 var(--font-sans)', color: 'var(--fg-1)', whiteSpace: 'pre-wrap' }}>
                {selected.body}
              </div>
            </article>
          ) : articles.length === 0 ? (
            <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
              Belum ada artikel terbit di kategori ini.
            </div>
          ) : (
            <div style={{ font: '14px/1.5 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center', padding: 'var(--s-8)' }}>
              Pilih artikel dari samping untuk membaca.
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}
