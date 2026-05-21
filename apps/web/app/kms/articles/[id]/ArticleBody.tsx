'use client'

import type { JSONContent } from '@tiptap/react'
import { RichEditor } from '../../../../components/editor'

export function ArticleBody({ body, bodyJson }: { body: string; bodyJson: unknown }) {
  if (bodyJson) {
    return (
      <RichEditor
        valueJson={bodyJson as JSONContent}
        readOnly
        showToolbar={false}
        minHeight={0}
      />
    )
  }

  if (!body) {
    return <em style={{ color: 'var(--fg-3)' }}>Artikel kosong. Klik Edit untuk menambahkan konten.</em>
  }

  return (
    <div style={{ font: '15px/1.7 var(--font-sans)', color: 'var(--fg-1)', whiteSpace: 'pre-wrap' }}>
      {body}
    </div>
  )
}
