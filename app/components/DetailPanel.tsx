'use client'

import type { Node } from '../types'

const PHASE_LABELS: Record<number, string> = {
  0: 'Core',
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
}

const PHASE_COLORS: Record<number, string> = {
  0: 'var(--navy)',
  1: 'var(--indigo)',
  2: 'var(--teal)',
  3: 'var(--amber)',
}

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  'planned':     { background: 'var(--border)', color: 'var(--slate)' },
  'in-progress': { background: 'var(--indigo-light)', color: 'var(--indigo)' },
  'done':        { background: 'var(--teal-light)', color: 'var(--teal)' },
}

type Props = {
  node: Node | null
  onClose: () => void
}

export default function DetailPanel({ node, onClose }: Props) {
  return (
    <div style={{
      width: node ? 320 : 0,
      flexShrink: 0,
      overflow: 'hidden',
      borderLeft: node ? '1px solid var(--border)' : 'none',
      background: 'var(--white)',
      transition: 'width 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {node && (
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: PHASE_COLORS[node.phase],
              marginTop: 4,
              flexShrink: 0,
            }} />
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, lineHeight: 1.3 }}>
            {node.label}
          </h2>

          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
            {node.description}
          </p>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="Phase" value={PHASE_LABELS[node.phase]} color={PHASE_COLORS[node.phase]} />
            <Row label="Type" value={node.type} />
            <StatusRow label="Status" status={node.status} />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--slate)' }}>{value}</span>
    </div>
  )
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES['planned']
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 4,
        ...style,
      }}>
        {status}
      </span>
    </div>
  )
}
