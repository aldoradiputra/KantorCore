'use client'

import { useState } from 'react'
import type { Node } from '../types'

const PHASE_COLOR: Record<number, string> = {
  1: 'var(--indigo)',
  2: 'var(--teal)',
  3: 'var(--amber)',
}
const PHASE_BG: Record<number, string> = {
  1: 'var(--indigo-light)',
  2: 'var(--teal-light)',
  3: 'var(--amber-light)',
}
const PHASE_META: Record<number, { label: string; milestone: string; timeline: string }> = {
  1: { label: 'Foundation',  milestone: 'v1.0', timeline: '~12 months' },
  2: { label: 'Expansion',   milestone: 'v2.0', timeline: '~24 months' },
  3: { label: 'Scale',       milestone: 'v3.0', timeline: '~36 months' },
}
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'planned':     { bg: 'var(--border)',       color: 'var(--muted)'   },
  'in-progress': { bg: 'var(--indigo-light)', color: 'var(--indigo)'  },
  'done':        { bg: 'var(--teal-light)',   color: 'var(--teal)'    },
}

type Props = {
  nodes: Node[]
  allNodes: Node[]
  selected: Node | null
  onSelect: (node: Node) => void
  isFiltering: boolean
}

export default function ListView({ nodes, allNodes, selected, onSelect, isFiltering }: Props) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({ 2: true, 3: true })

  if (nodes.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>No results match your filters.</span>
      </div>
    )
  }

  // Precompute child counts from allNodes
  const appsByModule    = new Map<string, Node[]>()
  const featuresByApp   = new Map<string, number>()
  const directFeatures  = new Map<string, number>()

  allNodes.forEach(n => {
    if (n.type === 'app' && n.parent) {
      const list = appsByModule.get(n.parent) ?? []
      list.push(n)
      appsByModule.set(n.parent, list)
    }
    if (n.type === 'feature' && n.parent) {
      featuresByApp.set(n.parent, (featuresByApp.get(n.parent) ?? 0) + 1)
    }
  })
  allNodes.forEach(n => {
    if (n.type === 'feature' && n.parent) {
      const parent = allNodes.find(x => x.id === n.parent)
      if (parent?.type === 'module') {
        directFeatures.set(n.parent, (directFeatures.get(n.parent) ?? 0) + 1)
      }
    }
  })

  function featureCount(moduleId: string): number {
    const apps = appsByModule.get(moduleId) ?? []
    if (apps.length > 0) {
      return apps.reduce((sum, app) => sum + (featuresByApp.get(app.id) ?? 0), 0)
    }
    return directFeatures.get(moduleId) ?? 0
  }
  function appCount(moduleId: string): number {
    return (appsByModule.get(moduleId) ?? []).length
  }

  // ── Filtered / search mode ───────────────────────────────────────────────
  if (isFiltering) {
    const byId = Object.fromEntries(allNodes.map(n => [n.id, n]))
    const results = nodes.filter(n => n.type !== 'root')

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        <div style={{ marginBottom: 20, fontSize: 12, color: 'var(--muted)' }}>
          {results.length} result{results.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {results.map(n => {
            const parent   = n.parent ? byId[n.parent] : null
            const grandpa  = parent?.parent ? byId[parent.parent] : null
            const color    = PHASE_COLOR[n.phase] ?? 'var(--muted)'
            const isActive = selected?.id === n.id
            const breadcrumb = [grandpa?.label, parent?.label].filter(Boolean).join(' › ')
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', border: 'none', borderRadius: 7,
                  background: isActive ? 'var(--indigo-light)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: n.type === 'module' ? 700 : 500, color: 'var(--navy)' }}>
                  {n.label}
                </span>
                {breadcrumb && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{breadcrumb}</span>
                )}
                {n.code && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{n.code}</span>
                )}
                <StatusBadge status={n.status} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Normal mode: phase timeline ──────────────────────────────────────────
  const modules = nodes.filter(n => n.type === 'module')

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px' }}>
      {([1, 2, 3] as const).map(phase => {
        const phaseModules = modules.filter(m => m.phase === phase)
        if (phaseModules.length === 0) return null
        const meta    = PHASE_META[phase]
        const color   = PHASE_COLOR[phase]
        const bg      = PHASE_BG[phase]
        const isOpen  = !collapsed[phase]

        return (
          <section key={phase} style={{ marginBottom: 40 }}>
            {/* Phase banner */}
            <button
              onClick={() => setCollapsed(c => ({ ...c, [phase]: !c[phase] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', marginBottom: isOpen ? 20 : 0,
                padding: '12px 16px',
                background: bg, border: 'none',
                borderLeft: `4px solid ${color}`, borderRadius: '0 8px 8px 0',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                transition: 'margin 0.15s',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Phase {phase} — {meta.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.7 }}>{meta.milestone}</span>
              <span style={{ width: 1, height: 12, background: color, opacity: 0.25 }} />
              <span style={{ fontSize: 11, color, opacity: 0.6 }}>{phaseModules.length} modules</span>
              <span style={{ width: 1, height: 12, background: color, opacity: 0.25 }} />
              <span style={{ fontSize: 11, color, opacity: 0.6 }}>{meta.timeline}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color, opacity: 0.5, transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
                ›
              </span>
            </button>

            {/* Module cards grid */}
            {isOpen && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: 12,
              }}>
                {phaseModules.map(mod => {
                  const apps     = appCount(mod.id)
                  const features = featureCount(mod.id)
                  const isActive = selected?.id === mod.id

                  return (
                    <button
                      key={mod.id}
                      onClick={() => onSelect(mod)}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        padding: '14px 16px',
                        border: `1px solid ${isActive ? color : 'var(--border)'}`,
                        borderTop: `3px solid ${color}`,
                        borderRadius: 8,
                        background: isActive ? bg : 'var(--white)',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        transition: 'border-color 0.12s, box-shadow 0.12s',
                        boxShadow: isActive ? `0 0 0 2px ${bg}` : 'none',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)' } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' } }}
                    >
                      {/* Top row: code + status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color, letterSpacing: '0.3px' }}>
                          {mod.code ?? mod.id.toUpperCase()}
                        </span>
                        <StatusBadge status={mod.status} />
                      </div>

                      {/* Module name */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, lineHeight: 1.3 }}>
                        {mod.label}
                      </div>

                      {/* Description snippet */}
                      <div style={{
                        fontSize: 11, color: 'var(--muted)', lineHeight: 1.55,
                        flex: 1, marginBottom: 12,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {mod.description}
                      </div>

                      {/* Footer: counts + milestone */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {mod.milestone && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 6px',
                            background: bg, color, borderRadius: 4,
                          }}>
                            {mod.milestone}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                          {apps > 0 ? `${apps} apps · ` : ''}{features} features
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['planned']
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px',
      borderRadius: 4, whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  )
}
