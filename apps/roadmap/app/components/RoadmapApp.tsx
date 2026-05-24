'use client'

import { useEffect, useState } from 'react'
import ListView from './ListView'
import MapView from './MapView'
import DetailPanel from './DetailPanel'
import SearchFilterBar, { Filters } from './SearchFilterBar'
import TopNav from './TopNav'
import SearchModal from './SearchModal'
import { LocaleContext, type Locale } from '../locale-context'
import type { Node } from '@kantorcore/types'

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

type ViewMode = 'list' | 'map'

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'map',  label: 'Map'  },
]

export default function RoadmapApp({ nodes, version }: Props) {
  const [selected, setSelected] = useState<Node | null>(null)
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS)
  const [view, setView]         = useState<ViewMode>('list')
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

  const handleSearchNavigate = (id: string) => {
    setSearchOpen(false)
    const node = nodes.find(n => n.id === id) ?? null
    setSelected(node)
  }

  const toggleLocale = () => setLocale(l => l === 'en' ? 'id' : 'en')

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
    <LocaleContext.Provider value={locale}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TopNav
          version={version}
          onOpenSearch={() => setSearchOpen(true)}
          locale={locale}
          onLocaleToggle={toggleLocale}
        />

        {/* View toggle */}
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
              onSelect={setSelected}
              isFiltering={!!filters.search || filters.phases.length < 3}
            />
          )}
          {view === 'map' && (
            <MapView
              nodes={nodes}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          <DetailPanel node={selected} allNodes={nodes} onClose={() => setSelected(null)} />
        </div>

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
