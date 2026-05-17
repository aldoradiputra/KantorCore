'use client'

import { useEffect, useRef, useState } from 'react'
import { DOCS_MAP } from '../docs-content'
import { useLocale, STRINGS } from '../locale-context'
import type { Node } from '@kantr/types'

type DocResult  = { kind: 'doc';  id: string; title: string; breadcrumb: string }
type NodeResult = { kind: 'node'; id: string; label: string; phase: number; code?: string }
type Result = DocResult | NodeResult

const PHASE_COLOR: Record<number, string> = { 1: 'var(--indigo)', 2: 'var(--teal)', 3: 'var(--amber)' }

// Build static index once
const DOC_INDEX: DocResult[] = Object.values(DOCS_MAP).map(p => ({
  kind: 'doc',
  id: p.id,
  title: p.title,
  breadcrumb: p.breadcrumb ?? 'Documentation',
}))

type Props = {
  nodes: Node[]
  onNavigate: (kind: 'doc' | 'node', id: string) => void
  onClose: () => void
}

export default function SearchModal({ nodes, onNavigate, onClose }: Props) {
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const locale = useLocale()
  const s = STRINGS[locale]

  useEffect(() => { inputRef.current?.focus() }, [])

  const NODE_INDEX: NodeResult[] = nodes
    .filter(n => n.type === 'module' || n.type === 'app')
    .map(n => ({ kind: 'node', id: n.id, label: n.label, phase: n.phase, code: n.code }))

  const q = query.toLowerCase().trim()

  const docResults: DocResult[] = q
    ? DOC_INDEX.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.breadcrumb.toLowerCase().includes(q)
      ).slice(0, 6)
    : DOC_INDEX.slice(0, 5)

  const nodeResults: NodeResult[] = q
    ? NODE_INDEX.filter(r =>
        r.label.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q)
      ).slice(0, 6)
    : NODE_INDEX.filter(r => r.phase === 1).slice(0, 5)

  const allResults: Result[] = [...docResults, ...nodeResults]

  useEffect(() => { setCursor(0) }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && allResults[cursor]) onNavigate(allResults[cursor].kind, allResults[cursor].id)
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,15,40,0.5)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', paddingTop: 100, zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: 560, background: 'var(--white)', borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={s.searchModalPlaceholder}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              fontFamily: 'inherit', color: 'var(--navy)', background: 'none',
            }}
          />
          <kbd style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit' }}>
            esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {allResults.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              {s.searchEmpty} &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {docResults.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {s.searchGroupDocs}
                  </div>
                  {docResults.map((r, i) => {
                    const active = cursor === i
                    return (
                      <button
                        key={r.id}
                        onClick={() => onNavigate(r.kind, r.id)}
                        onMouseEnter={() => setCursor(i)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 16px', border: 'none', cursor: 'pointer',
                          background: active ? 'var(--indigo-light)' : 'transparent',
                          borderLeft: `2px solid ${active ? 'var(--indigo)' : 'transparent'}`,
                          fontFamily: 'inherit', transition: 'background 0.1s',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.breadcrumb}</div>
                      </button>
                    )
                  })}
                </>
              )}

              {nodeResults.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {s.searchGroupModules}
                  </div>
                  {nodeResults.map((r, i) => {
                    const idx    = docResults.length + i
                    const active = cursor === idx
                    const color  = PHASE_COLOR[r.phase] ?? 'var(--muted)'
                    return (
                      <button
                        key={r.id}
                        onClick={() => onNavigate(r.kind, r.id)}
                        onMouseEnter={() => setCursor(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', textAlign: 'left',
                          padding: '10px 16px', border: 'none', cursor: 'pointer',
                          background: active ? 'var(--indigo-light)' : 'transparent',
                          borderLeft: `2px solid ${active ? 'var(--indigo)' : 'transparent'}`,
                          fontFamily: 'inherit', transition: 'background 0.1s',
                        }}
                      >
                        <div style={{
                          flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                          background: 'var(--bg)', border: `1px solid ${color}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color, letterSpacing: '0.3px',
                        }}>
                          P{r.phase}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 1 }}>{r.label}</div>
                          {r.code && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.code}</div>}
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <kbd style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', background: 'var(--white)', fontFamily: 'inherit' }}>{key}</kbd>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
