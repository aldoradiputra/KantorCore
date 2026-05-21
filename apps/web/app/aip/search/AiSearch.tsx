'use client'

import { useRef, useState } from 'react'

const SUGGESTIONS = [
  'Berapa total nilai deal pipeline yang sedang berjalan?',
  'Tampilkan semua PO yang statusnya confirmed',
  'Siapa pelanggan dengan faktur terbesar bulan ini?',
  'Dokumen apa yang akan kadaluarsa dalam 30 hari?',
  'Produk apa yang harga jualnya di atas 1 juta?',
  'Ringkasan status tagihan vendor bulan ini',
]

export function AiSearch({ tenantName }: { tenantName: string }) {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<{ q: string; a: string }[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)

  async function runSearch(q: string) {
    if (!q.trim() || loading) return
    setLoading(true)
    setError(null)
    setAnswer('')

    try {
      const res = await fetch('/api/aip/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => 'Terjadi kesalahan.')
        setError(text)
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setAnswer(full)
        answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }

      setHistory((h) => [{ q, a: full }, ...h.slice(0, 9)])
    } catch {
      setError('Gagal menghubungi AI. Periksa koneksi atau konfigurasi API key.')
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(query)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runSearch(query)
    }
  }

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 800 }}>
      <header>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>AI Search</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
          Tanya apapun tentang data di workspace <strong>{tenantName}</strong>. AI membaca data real-time dari semua modul.
        </p>
      </header>

      {/* Search form */}
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tanya sesuatu… (Enter untuk kirim, Shift+Enter untuk baris baru)"
            disabled={loading}
            rows={3}
            style={{
              padding: '12px 14px',
              paddingRight: 50,
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)',
              font: '14px/1.5 var(--font-sans)',
              color: 'var(--fg-1)',
              background: 'var(--bg-1)',
              resize: 'none',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              width: 32,
              height: 32,
              borderRadius: 'var(--r-sm)',
              background: loading || !query.trim() ? 'var(--border)' : 'var(--indigo)',
              border: 'none',
              cursor: loading || !query.trim() ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              font: '14px/1 sans-serif',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '…' : '↑'}
          </button>
        </div>

        {/* Suggestion chips */}
        {!answer && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setQuery(s); runSearch(s) }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--fg-2)',
                  font: '12px/1 var(--font-sans)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Answer */}
      {(answer || loading) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {/* Question echo */}
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '13px/1.5 var(--font-sans)', alignSelf: 'flex-end', maxWidth: '80%' }}>
            {query}
          </div>

          {/* AI answer */}
          <div
            ref={answerRef}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              font: '14px/1.7 var(--font-sans)',
              color: 'var(--fg-1)',
              whiteSpace: 'pre-wrap',
              minHeight: 60,
            }}
          >
            {loading && !answer
              ? <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>Sedang menganalisis data…</span>
              : answer
            }
            {loading && answer && <span style={{ color: 'var(--indigo)', animation: 'pulse 1s infinite' }}>▌</span>}
          </div>

          {!loading && (
            <button
              type="button"
              onClick={() => { setAnswer(''); setQuery(''); inputRef.current?.focus() }}
              style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--fg-3)', font: '12px/1 var(--font-sans)', cursor: 'pointer', padding: '4px 0' }}
            >
              + Pertanyaan baru
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}

      {/* History */}
      {history.length > 0 && !answer && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Riwayat Sesi Ini</div>
          {history.map((item, i) => (
            <div
              key={i}
              style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', cursor: 'pointer' }}
              onClick={() => { setQuery(item.q); setAnswer(item.a) }}
            >
              <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)', marginBottom: 4 }}>{item.q}</div>
              <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.a.slice(0, 120)}…</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
