import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getSpace, listArticles } from '../../../../lib/kms'
import type { ArticleStatus } from '../../../../lib/kms'

const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft:     'Draf',
  published: 'Terbit',
  archived:  'Diarsipkan',
}

const STATUS_COLOR: Record<ArticleStatus, string> = {
  draft:     'var(--fg-3)',
  published: 'var(--success)',
  archived:  'var(--fg-3)',
}

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { slug } = await params
  const space = await getSpace(ctx.tenant.id, slug)
  if (!space) redirect('/kms')

  const articles = await listArticles(ctx.tenant.id, { spaceId: space.id })

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div>
        <Link href="/kms" style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
          ← Knowledge Base
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginTop: 8 }}>
          <span style={{ fontSize: 32 }}>{space.icon || '📚'}</span>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
              {space.name}
            </h1>
            {space.description && (
              <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
                {space.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/kms/new?spaceId=${space.id}`}
        style={{
          height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)',
          color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
          font: '600 13px/36px var(--font-sans)', textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        + Artikel Baru
      </Link>

      {articles.length === 0 ? (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Belum ada artikel di space ini.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/kms/articles/${a.id}`}
              style={{
                padding: 'var(--s-3) var(--s-4)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                textDecoration: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--s-3)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {a.title}
                </div>
                {a.excerpt && (
                  <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                    {a.excerpt.length > 100 ? a.excerpt.slice(0, 100) + '…' : a.excerpt}
                  </div>
                )}
                {a.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {a.tags.slice(0, 4).map((tag) => (
                      <span key={tag} style={{
                        padding: '2px 8px',
                        background: 'var(--bg)',
                        borderRadius: 999,
                        font: '10px/1 var(--font-sans)',
                        color: 'var(--fg-2)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{
                  font: '600 11px/1 var(--font-sans)',
                  color: STATUS_COLOR[a.status],
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {STATUS_LABEL[a.status]}
                </span>
                <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                  {a.viewCount} dilihat
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
