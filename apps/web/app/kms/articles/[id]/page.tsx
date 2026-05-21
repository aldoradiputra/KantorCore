import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getArticle, getSpace, incrementViewCount } from '../../../../lib/kms'
import ArticleActions from './ArticleActions'
import { ArticleBody } from './ArticleBody'

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id } = await params
  const article = await getArticle(ctx.tenant.id, id)
  if (!article) redirect('/kms')

  const space = await getSpace(ctx.tenant.id, article.spaceId)
  await incrementViewCount(ctx.tenant.id, article.id)

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--s-4)' }}>
        {space && (
          <Link href={`/kms/spaces/${space.slug}`} style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
            ← {space.name}
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-4)', marginBottom: 'var(--s-5)' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ font: '700 28px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            {article.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginTop: 12, font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {article.status === 'draft' ? 'DRAF' : article.status === 'published' ? 'TERBIT' : 'DIARSIPKAN'}
            </span>
            <span>·</span>
            <span>{article.viewCount} kali dilihat</span>
            {article.publishedAt && (
              <>
                <span>·</span>
                <span>diterbitkan {new Date(article.publishedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </>
            )}
          </div>
        </div>

        <ArticleActions article={article} />
      </div>

      {article.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--s-5)' }}>
          {article.tags.map((tag) => (
            <span key={tag} style={{
              padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 999, font: '11px/1 var(--font-sans)', color: 'var(--fg-2)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <ArticleBody body={article.body} bodyJson={article.bodyJson} />
    </div>
  )
}
