import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listSpaces, listArticles } from '../../lib/kms'
import KmsSpacesClient from './KmsSpacesClient'

const VISIBILITY_LABEL: Record<string, string> = {
  internal: 'Internal',
  portal:   'Portal',
  public:   'Publik',
}

export default async function KmsHome() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const spaces = await listSpaces(ctx.tenant.id)
  const allArticles = await listArticles(ctx.tenant.id, { limit: 1000 })

  // article counts per space
  const counts: Record<string, number> = {}
  for (const a of allArticles) {
    counts[a.spaceId] = (counts[a.spaceId] ?? 0) + 1
  }

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Knowledge Base
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Wiki internal, panduan SDM, dan help center pelanggan.
          </p>
        </div>
        <Link
          href="/kms/new"
          style={{
            height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)',
            color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
            font: '600 13px/36px var(--font-sans)', textDecoration: 'none',
          }}
        >
          + Artikel Baru
        </Link>
      </div>

      <KmsSpacesClient spaces={spaces} counts={counts} isAdmin={isAdmin} />
    </div>
  )
}
