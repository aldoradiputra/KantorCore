'use client'

import type { Node } from '../types'
import { DOCS_MAP } from '../docs-content'

const PHASE_LABELS: Record<number, string> = {
  0: 'Core',
  1: 'Phase 1 — Foundation',
  2: 'Phase 2 — Expansion',
  3: 'Phase 3 — Scale',
}
const PHASE_COLORS: Record<number, string> = {
  0: 'var(--navy)',
  1: 'var(--indigo)',
  2: 'var(--teal)',
  3: 'var(--amber)',
}
const PHASE_BG: Record<number, string> = {
  0: 'var(--indigo-light)',
  1: 'var(--indigo-light)',
  2: 'var(--teal-light)',
  3: 'var(--amber-light)',
}
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'planned':     { bg: 'var(--border)',       color: 'var(--slate)'  },
  'in-progress': { bg: 'var(--indigo-light)', color: 'var(--indigo)' },
  'done':        { bg: 'var(--teal-light)',   color: 'var(--teal)'   },
}

type Props = {
  node: Node | null
  allNodes: Node[]
  onClose: () => void
  onViewDocs: (id: string) => void
}

export default function DetailPanel({ node, allNodes, onClose, onViewDocs }: Props) {
  return (
    <div style={{
      width: node ? 300 : 0,
      flexShrink: 0,
      overflow: 'hidden',
      borderLeft: node ? '1px solid var(--border)' : 'none',
      background: 'var(--white)',
      transition: 'width 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {node && <PanelContent node={node} allNodes={allNodes} onClose={onClose} onViewDocs={onViewDocs} />}
    </div>
  )
}

function PanelContent({ node, allNodes, onClose, onViewDocs }: {
  node: Node
  allNodes: Node[]
  onClose: () => void
  onViewDocs: (id: string) => void
}) {
  const color   = PHASE_COLORS[node.phase] ?? 'var(--navy)'
  const bg      = PHASE_BG[node.phase] ?? 'var(--indigo-light)'
  const hasDoc  = !!DOCS_MAP[node.id]

  // Compute children for module/app nodes
  const children = allNodes.filter(n => n.parent === node.id)
  const apps     = children.filter(n => n.type === 'app')
  const features = children.filter(n => n.type === 'feature' || n.type === 'infrastructure')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Color strip header */}
      <div style={{
        background: bg,
        borderBottom: `2px solid ${color}`,
        padding: '14px 16px 12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {node.code && (
              <span style={{
                fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                color, background: 'var(--white)', border: `1px solid ${color}`,
                borderRadius: 4, padding: '2px 6px', letterSpacing: '0.3px',
              }}>
                {node.code}
              </span>
            )}
            {node.milestone && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                background: 'var(--white)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 6px',
              }}>
                {node.milestone}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3, marginBottom: 4 }}>
          {node.label}
        </h2>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>
          {PHASE_LABELS[node.phase]}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Status</span>
          <StatusBadge status={node.status} />
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.65, marginBottom: 20 }}>
          {node.description}
        </p>

        {/* Apps section */}
        {apps.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Apps · {apps.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {apps.map(app => {
                const appFeatures = allNodes.filter(n => n.parent === app.id)
                return (
                  <div key={app.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 6, background: 'var(--bg)',
                  }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{app.label}</span>
                    {appFeatures.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{appFeatures.length}</span>
                    )}
                    <StatusBadge status={app.status} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Direct features (no app layer) */}
        {features.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Features · {features.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {features.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 5, background: 'var(--bg)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ flex: 1, fontSize: 11, color: 'var(--slate)' }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View docs link */}
        {hasDoc && (
          <button
            onClick={() => onViewDocs(node.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 12px',
              background: bg, border: `1px solid ${color}`,
              borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1, textAlign: 'left' }}>Read the docs</span>
            <span style={{ fontSize: 12, color, opacity: 0.7 }}>→</span>
          </button>
        )}
      </div>
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
