import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { getArticle, listSpaces } from '../../../../../lib/kms'
import ArticleEditor from './ArticleEditor'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id } = await params
  const [article, spaces] = await Promise.all([
    getArticle(ctx.tenant.id, id),
    listSpaces(ctx.tenant.id),
  ])

  if (!article) redirect('/kms')

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Knowledge Base · Edit</span>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          {article.title}
        </h1>
      </header>
      <ArticleEditor spaces={spaces} article={article} initialSpaceId={article.spaceId} />
    </div>
  )
}
