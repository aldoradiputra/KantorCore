'use client'

import { useState } from 'react'
import ListView from './ListView'
import MapView from './MapView'
import DetailPanel from './DetailPanel'
import SearchFilterBar, { Filters } from './SearchFilterBar'

export type Node = {
  id: string
  label: string
  description: string
  type: 'root' | 'module' | 'app' | 'feature' | 'infrastructure'
  status: 'planned' | 'in-progress' | 'done'
  phase: number
  parent?: string
  code?: string
  milestone?: string
  x?: number
  y?: number
}

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

export default function RoadmapApp({ nodes, version }: Props) {
  const [selected, setSelected] = useState<Node | null>(null)
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS)
  const [view, setView]         = useState<ViewMode>('list')

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        height: 52,
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15, letterSpacing: '-0.3px' }}>
          Indonesia System
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--white)',
          background: 'var(--indigo)',
          borderRadius: 4,
          padding: '2px 7px',
          letterSpacing: '0.2px',
        }}>
          v{version}
        </span>
        <span style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          padding: 3,
          gap: 2,
        }}>
          {(['list', 'map'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 5,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: view === v ? 'var(--white)' : 'transparent',
                color: view === v ? 'var(--navy)' : 'var(--muted)',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Roadmap</span>
      </header>

      {/* Search + Filter bar — only in list view */}
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
        {view === 'list' ? (
          <ListView
            nodes={visibleNodes}
            allNodes={nodes}
            selected={selected}
            onSelect={setSelected}
            isFiltering={!!filters.search || filters.phases.length < 3}
          />
        ) : (
          <MapView
            nodes={nodes}
            selected={selected}
            onSelect={setSelected}
          />
        )}
        <DetailPanel node={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  )
}
