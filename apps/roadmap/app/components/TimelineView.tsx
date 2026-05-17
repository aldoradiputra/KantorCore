'use client'

import type { Node } from '@kantr/types'

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

const PHASES = [
  { phase: 1 as const, milestone: 'v1.0',  label: 'Foundation', timeline: '~12 months' },
  { phase: 2 as const, milestone: 'v2.0',  label: 'Expansion',  timeline: '~24 months' },
  { phase: 3 as const, milestone: 'v3.0+', label: 'Scale',      timeline: '~36 months' },
]

type Props = {
  nodes: Node[]
  selected: Node | null
  onSelect: (n: Node) => void
}

export default function TimelineView({ nodes, selected, onSelect }: Props) {
  const modules = nodes.filter(n => n.type === 'module')

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      overflowX: 'auto',
      overflowY: 'hidden',
      padding: '28px 32px 0',
      gap: 0,
    }}>
      {PHASES.map(({ phase, milestone, label, timeline }, idx) => {
        const phaseModules = modules.filter(m => m.phase === phase)
        const color  = PHASE_COLOR[phase]
        const bg     = PHASE_BG[phase]
        const isLast = idx === PHASES.length - 1

        return (
          <div key={phase} style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 300,
            flex: 1,
            borderRight: isLast ? 'none' : '1px solid var(--border)',
            paddingLeft:  idx === 0 ? 0 : 28,
            paddingRight: isLast   ? 0 : 28,
            paddingBottom: 48,
          }}>
            {/* Column header */}
            <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, color,
                  letterSpacing: '0.8px', textTransform: 'uppercase',
                }}>
                  Phase {phase} — {label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: bg, color, borderRadius: 4, padding: '1px 7px',
                }}>
                  {milestone}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {phaseModules.length} modules · {timeline}
              </div>
            </div>

            {/* Cards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              overflowY: 'auto',
              flex: 1,
              paddingBottom: 16,
            }}>
              {phaseModules.map(mod => {
                const isActive = selected?.id === mod.id
                return (
                  <button
                    key={mod.id}
                    onClick={() => onSelect(mod)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      border: `1px solid ${isActive ? color : 'var(--border)'}`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 8,
                      background: isActive ? bg : 'var(--white)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.12s, border-color 0.12s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bg }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--white)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color, flexShrink: 0 }}>
                          {mod.code ?? mod.id.toUpperCase()}
                        </span>
                        <StatusDot status={mod.status} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.3 }}>
                        {mod.label}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'planned':     'var(--border)',
    'in-progress': 'var(--indigo)',
    'done':        'var(--teal)',
  }
  return (
    <span title={status} style={{
      width: 7, height: 7, borderRadius: '50%',
      background: colors[status] ?? colors.planned,
      flexShrink: 0,
    }} />
  )
}
