import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listSpaces } from '../../../lib/kms'
import ArticleEditor from '../articles/[id]/edit/ArticleEditor'

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const spaces = await listSpaces(ctx.tenant.id)
  if (spaces.length === 0) redirect('/kms')

  const { spaceId } = await searchParams
  const initialSpaceId = spaceId || spaces[0]!.id

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Knowledge Base · Artikel Baru</span>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          Tulis Artikel
        </h1>
      </header>
      <ArticleEditor spaces={spaces} initialSpaceId={initialSpaceId} />
    </div>
  )
}
