'use client'

import { useEffect, useState } from 'react'
import ListView from './ListView'
import MapView from './MapView'
import TimelineView from './TimelineView'
import BoardView from './BoardView'
import DetailPanel from './DetailPanel'
import SearchFilterBar, { Filters } from './SearchFilterBar'
import TopNav, { Page } from './TopNav'
import DocsView from './DocsView'
import LearnView from './LearnView'
import SearchModal from './SearchModal'
import { LocaleContext, type Locale } from '../locale-context'
import type { Node } from '../types'

export type { Node }

type Props = {
  nodes: Node[]
  version: string
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  phases: [1, 2, 3],
  statuses: ['planned', 'in-progress', 'done'],
  types: ['module', 'app', 'feature', 'infrastructure'],
}

type ViewMode = 'list' | 'map' | 'timeline' | 'board'

export default function RoadmapApp({ nodes, version }: Props) {
  const [page, setPage]         = useState<Page>('roadmap')
  const [selected, setSelected] = useState<Node | null>(null)
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS)
  const [view, setView]         = useState<ViewMode>('list')
  const [activeDoc, setActiveDoc]   = useState('welcome')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locale, setLocale]         = useState<Locale>('en')

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSearchNavigate = (kind: 'doc' | 'node', id: string) => {
    setSearchOpen(false)
    if (kind === 'doc') {
      setPage('docs')
      setActiveDoc(id)
    } else {
      // node result — go to roadmap list and select the node
      setPage('roadmap')
      const node = nodes.find(n => n.id === id) ?? null
      setSelected(node)
    }
  }

  const toggleLocale = () => setLocale(l => l === 'en' ? 'id' : 'en')

  return (
    <LocaleContext.Provider value={locale}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopNav page={page} onChange={setPage} version={version} onOpenSearch={() => setSearchOpen(true)} locale={locale} onLocaleToggle={toggleLocale} />

      {page === 'roadmap' && (
        <RoadmapPage
          nodes={nodes}
          selected={selected}
          onSelect={setSelected}
          filters={filters}
          setFilters={setFilters}
          view={view}
          setView={setView}
          onViewDocs={(id) => { setPage('docs'); setActiveDoc(id) }}
        />
      )}

      {page === 'docs'  && <DocsView nodes={nodes} version={version} activeDoc={activeDoc} onDocChange={setActiveDoc} />}
      {page === 'learn' && <LearnView />}

      {searchOpen && (
        <SearchModal
          nodes={nodes}
          onNavigate={handleSearchNavigate}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
    </LocaleContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap page (extracted from the previous top-level component)
// ─────────────────────────────────────────────────────────────────────────────

type RoadmapPageProps = {
  nodes: Node[]
  selected: Node | null
  onSelect: (n: Node | null) => void
  filters: Filters
  setFilters: (f: Filters) => void
  view: ViewMode
  setView: (v: ViewMode) => void
  onViewDocs: (id: string) => void
}

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'list',     label: 'List'     },
  { id: 'timeline', label: 'Timeline' },
  { id: 'board',    label: 'Board'    },
  { id: 'map',      label: 'Map'      },
]

function RoadmapPage({ nodes, selected, onSelect, filters, setFilters, view, setView, onViewDocs }: RoadmapPageProps) {
  const displayable = nodes.filter(n => n.type !== 'root')

  const filtered = displayable.filter(n => {
    if (!filters.phases.includes(n.phase)) return false
    if (!filters.statuses.includes(n.status)) return false
    if (!filters.types.includes(n.type)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!n.label.toLowerCase().includes(q) &&
          !n.description.toLowerCase().includes(q) &&
          !(n.code?.toLowerCase().includes(q))) return false
    }
    return true
  })

  // When filtering, include ancestor modules/apps so hierarchy still renders
  const visibleIds = new Set<string>()
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  filtered.forEach(n => {
    visibleIds.add(n.id)
    let cur = n.parent ? byId[n.parent] : null
    while (cur && cur.type !== 'root') {
      visibleIds.add(cur.id)
      cur = cur.parent ? byId[cur.parent] : null
    }
  })
  const visibleNodes = nodes.filter(n => visibleIds.has(n.id))

  return (
    <>
      {/* Roadmap-local toolbar (List / Map toggle) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.3px' }}>
          VIEW
        </span>
        <div style={{
          display: 'flex',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          padding: 3,
          gap: 2,
        }}>
          {VIEW_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 5,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: view === id ? 'var(--white)' : 'transparent',
                color: view === id ? 'var(--navy)' : 'var(--muted)',
                boxShadow: view === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + filter bar — only in list view */}
      {view === 'list' && (
        <SearchFilterBar
          filters={filters}
          onChange={setFilters}
          total={displayable.length}
          visible={filtered.length}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'list' && (
          <ListView
            nodes={visibleNodes}
            allNodes={nodes}
            selected={selected}
            onSelect={onSelect}
            isFiltering={!!filters.search || filters.phases.length < 3}
          />
        )}
        {view === 'timeline' && (
          <TimelineView
            nodes={nodes}
            selected={selected}
            onSelect={onSelect}
          />
        )}
        {view === 'board' && (
          <BoardView
            nodes={nodes}
            selected={selected}
            onSelect={onSelect}
          />
        )}
        {view === 'map' && (
          <MapView
            nodes={nodes}
            selected={selected}
            onSelect={onSelect}
          />
        )}
        <DetailPanel node={selected} allNodes={nodes} onClose={() => onSelect(null)} onViewDocs={onViewDocs} />
      </div>
    </>
  )
}
