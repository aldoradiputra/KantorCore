'use client'

import type { Node } from '../types'

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

const PHASE_LABELS: Record<number, string> = {
  0: 'Core',
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
}

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  'planned':     { background: 'var(--border)', color: 'var(--muted)' },
  'in-progress': { background: 'var(--indigo-light)', color: 'var(--indigo)' },
  'done':        { background: 'var(--teal-light)', color: 'var(--teal)' },
}

type Props = {
  nodes: Node[]
  allNodes: Node[]
  selected: Node | null
  onSelect: (node: Node) => void
  isFiltering: boolean
}

export default function ListView({ nodes, selected, onSelect, isFiltering }: Props) {
  const nodeSet = new Set(nodes.map(n => n.id))
  const byParent = (parentId: string, type?: string) =>
    nodes.filter(n => n.parent === parentId && (type ? n.type === type : true))

  const modules = nodes.filter(n => n.type === 'module' && n.parent === 'core')
  const platformNodes = nodes.filter(n => n.parent === 'core' && n.type !== 'module' && n.type !== 'root')

  const phaseOrder = [1, 2, 3]
  const modulesByPhase = (phase: number) => modules.filter(m => m.phase === phase)

  if (nodes.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>No results match your filters.</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

      {/* Platform section */}
      {platformNodes.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <SectionHeader label="Platform" color="var(--navy)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {platformNodes.map(node => (
              <FeatureRow key={node.id} node={node} selected={selected} onSelect={onSelect} indent={0} />
            ))}
          </div>
        </section>
      )}

      {/* Modules grouped by phase */}
      {phaseOrder.map(phase => {
        const phaseModules = modulesByPhase(phase)
        if (phaseModules.length === 0) return null
        return (
          <div key={phase}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: PHASE_COLORS[phase],
              marginBottom: 16,
              marginTop: phase > 1 ? 40 : 0,
              paddingLeft: 2,
            }}>
              {PHASE_LABELS[phase]}
            </div>

            {phaseModules.map(module => {
              const apps = byParent(module.id, 'app')
              const directFeatures = nodes.filter(n => n.parent === module.id && n.type !== 'app')

              return (
                <section key={module.id} style={{ marginBottom: 28 }}>
                  {/* Module header */}
                  <button
                    onClick={() => onSelect(module)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      background: selected?.id === module.id ? PHASE_BG[phase] : 'transparent',
                      border: 'none',
                      borderLeft: `3px solid ${PHASE_COLORS[phase]}`,
                      borderRadius: '0 6px 6px 0',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14, color: PHASE_COLORS[phase], flex: 1 }}>
                      {module.label}
                    </span>
                    {module.code && (
                      <span style={{ fontSize: 10, color: PHASE_COLORS[phase], opacity: 0.7, fontFamily: 'monospace', marginRight: 4 }}>
                        {module.code}
                      </span>
                    )}
                    {module.milestone && (
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 6 }}>
                        {module.milestone}
                      </span>
                    )}
                    <StatusBadge status={module.status} />
                  </button>

                  {/* Apps and their features */}
                  {apps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 16 }}>
                      {apps.map(app => {
                        const features = byParent(app.id)
                        const visibleFeatures = features.filter(f => nodeSet.has(f.id))
                        return (
                          <div key={app.id}>
                            {/* App row */}
                            <button
                              onClick={() => onSelect(app)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                background: selected?.id === app.id ? PHASE_BG[app.phase] : 'transparent',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)', flex: 1 }}>
                                {app.label}
                              </span>
                              {app.code && (
                                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace', marginRight: 4 }}>
                                  {app.code}
                                </span>
                              )}
                              <StatusBadge status={app.status} />
                            </button>

                            {/* Feature rows */}
                            {visibleFeatures.map(feature => (
                              <FeatureRow key={feature.id} node={feature} selected={selected} onSelect={onSelect} indent={1} />
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Direct features (no app parent) */}
                  {directFeatures.map(feature => (
                    <FeatureRow key={feature.id} node={feature} selected={selected} onSelect={onSelect} indent={0} />
                  ))}
                </section>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color,
      marginBottom: 12,
      paddingLeft: 2,
    }}>
      {label}
    </div>
  )
}

function FeatureRow({ node, selected, onSelect, indent }: {
  node: Node
  selected: Node | null
  onSelect: (node: Node) => void
  indent: number
}) {
  const isSelected = selected?.id === node.id
  const phaseColor = PHASE_COLORS[node.phase]

  return (
    <button
      onClick={() => onSelect(node)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        paddingLeft: 16 + indent * 16,
        paddingRight: 8,
        paddingTop: 5,
        paddingBottom: 5,
        background: isSelected ? 'var(--indigo-light)' : 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: 2,
      }}
    >
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: phaseColor,
        flexShrink: 0,
        opacity: 0.6,
      }} />
      <span style={{ fontSize: 13, color: 'var(--slate)', flex: 1 }}>
        {node.label}
      </span>
      {node.code && (
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {node.code}
        </span>
      )}
      <StatusBadge status={node.status} />
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES['planned']
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 4,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {status}
    </span>
  )
}
