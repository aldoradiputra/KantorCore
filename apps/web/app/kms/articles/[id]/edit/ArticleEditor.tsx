'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JSONContent } from '@tiptap/react'
import { RichEditor } from '../../../../../components/editor'
import type { KmsSpace, KmsArticle, ArticleVisibility } from '../../../../../lib/kms'

export default function ArticleEditor({
  spaces,
  article,
  initialSpaceId,
}: {
  spaces: KmsSpace[]
  article?: KmsArticle
  initialSpaceId: string
}) {
  const router = useRouter()
  const isEdit = !!article

  const [spaceId, setSpaceId] = useState(initialSpaceId)
  const [title, setTitle] = useState(article?.title ?? '')
  const [bodyText, setBodyText] = useState(article?.body ?? '')
  const [bodyJson, setBodyJson] = useState<JSONContent | undefined>(
    article?.bodyJson as JSONContent | undefined
  )
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [visibility, setVisibility] = useState<ArticleVisibility>(article?.visibility ?? 'internal')
  const [tagsInput, setTagsInput] = useState((article?.tags ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleEditorChange(text: string, json: JSONContent) {
    setBodyText(text)
    setBodyJson(json)
  }

  async function save(publish = false) {
    setSaving(true); setError(null)
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      const payload: Record<string, unknown> = {
        spaceId, title, content: bodyText, bodyJson, excerpt: excerpt || null, visibility, tags,
      }
      if (publish) payload.status = 'published'

      const url = isEdit ? `/api/kms/articles/${article.id}` : '/api/kms/articles'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
      const saved = await res.json()
      router.push(`/kms/articles/${saved.id}`)
      router.refresh()
    } catch { setError('Kesalahan jaringan.') } finally { setSaving(false) }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(false) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Space">
          <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} style={inputStyle}>
            {spaces.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        </Field>
        <Field label="Visibilitas">
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as ArticleVisibility)} style={inputStyle}>
            <option value="internal">Internal</option>
            <option value="portal">Portal Pelanggan</option>
            <option value="public">Publik</option>
          </select>
        </Field>
      </div>

      <Field label="Judul">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }} placeholder="Judul artikel" />
      </Field>

      <Field label="Ringkasan (opsional)" hint="Tampil sebagai preview di daftar artikel">
        <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} style={inputStyle} placeholder="Singkat 1-2 kalimat tentang artikel ini" maxLength={200} />
      </Field>

      <Field label="Konten">
        <RichEditor
          value={!bodyJson ? bodyText : undefined}
          valueJson={bodyJson}
          onChange={handleEditorChange}
          placeholder="Tulis isi artikel di sini, atau ketik / untuk perintah blok…"
          minHeight={320}
        />
      </Field>

      <Field label="Tag" hint="Pisahkan dengan koma">
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} style={inputStyle} placeholder="bantuan, panduan, sdm" />
      </Field>

      {error && (
        <div style={{ padding: 'var(--s-3)', background: 'var(--red-light)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving}
          style={{
            height: 36, padding: '0 var(--s-4)', background: 'transparent',
            color: 'var(--fg-1)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Menyimpan…' : 'Simpan Draf'}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving}
          style={{
            height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)',
            color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
            font: '600 13px/1 var(--font-sans)',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {isEdit ? 'Simpan & Terbitkan' : 'Terbitkan'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            height: 36, padding: '0 var(--s-3)', background: 'transparent',
            color: 'var(--fg-3)', border: 'none', font: '13px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          Batal
        </button>
      </div>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{label}</label>
      {children}
      {hint && <div style={{ font: '11px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</div>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', width: '100%',
}
