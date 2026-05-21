'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { KmsArticle, ArticleStatus } from '../../../../lib/kms'

export default function ArticleActions({ article }: { article: KmsArticle }) {
  const router = useRouter()

  async function setStatus(status: ArticleStatus) {
    await fetch(`/api/kms/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, snapshot: false }),
    })
    router.refresh()
  }

  async function remove() {
    if (!confirm('Hapus artikel ini? Tindakan tidak dapat dibatalkan.')) return
    const res = await fetch(`/api/kms/articles/${article.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/kms')
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--s-2)', flexShrink: 0 }}>
      {article.status === 'draft' ? (
        <button
          type="button"
          onClick={() => setStatus('published')}
          style={{
            height: 32, padding: '0 var(--s-3)', background: 'var(--success)',
            color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
            font: '600 12px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          Terbitkan
        </button>
      ) : article.status === 'published' ? (
        <button
          type="button"
          onClick={() => setStatus('draft')}
          style={{
            height: 32, padding: '0 var(--s-3)', background: 'transparent',
            color: 'var(--fg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', font: '12px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          Kembali ke Draf
        </button>
      ) : null}

      <Link
        href={`/kms/articles/${article.id}/edit`}
        style={{
          height: 32, padding: '0 var(--s-3)', background: 'var(--indigo)',
          color: 'var(--white)', borderRadius: 'var(--r-sm)',
          font: '600 12px/32px var(--font-sans)', textDecoration: 'none',
        }}
      >
        Edit
      </Link>

      <button
        type="button"
        onClick={remove}
        style={{
          height: 32, padding: '0 var(--s-3)', background: 'transparent',
          color: 'var(--danger)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', font: '12px/1 var(--font-sans)', cursor: 'pointer',
        }}
      >
        Hapus
      </button>
    </div>
  )
}
