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

const COLUMNS = [
  { status: 'planned',     label: 'Planned',     color: 'var(--slate)',  bg: 'var(--bg)' },
  { status: 'in-progress', label: 'In Progress',  color: 'var(--indigo)', bg: 'var(--indigo-light)' },
  { status: 'done',        label: 'Done',         color: 'var(--teal)',   bg: 'var(--teal-light)' },
]

type Props = {
  nodes: Node[]
  selected: Node | null
  onSelect: (n: Node) => void
}

export default function BoardView({ nodes, selected, onSelect }: Props) {
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
      {COLUMNS.map(({ status, label, color, bg }, idx) => {
        const colModules = modules.filter(m => m.status === status)
        const isLast     = idx === COLUMNS.length - 1

        return (
          <div key={status} style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 300,
            flex: 1,
            borderRight: isLast ? 'none' : '1px solid var(--border)',
            paddingLeft:  idx === 0 ? 0 : 24,
            paddingRight: isLast   ? 0 : 24,
            paddingBottom: 48,
          }}>
            {/* Column header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
              padding: '8px 12px',
              background: bg,
              borderRadius: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 700, color,
                letterSpacing: '0.3px', textTransform: 'uppercase',
              }}>
                {label}
              </span>
              <span style={{
                marginLeft: 'auto',
                fontSize: 11, fontWeight: 700,
                background: 'var(--white)',
                color,
                borderRadius: 10,
                padding: '1px 8px',
              }}>
                {colModules.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              overflowY: 'auto',
              flex: 1,
              paddingBottom: 16,
            }}>
              {colModules.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 12,
                  border: '1px dashed var(--border)',
                  borderRadius: 8,
                }}>
                  No modules here yet
                </div>
              ) : colModules.map(mod => {
                const phaseColor = PHASE_COLOR[mod.phase]
                const phaseBg    = PHASE_BG[mod.phase]
                const isActive   = selected?.id === mod.id

                return (
                  <button
                    key={mod.id}
                    onClick={() => onSelect(mod)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 14px',
                      border: `1px solid ${isActive ? phaseColor : 'var(--border)'}`,
                      borderTop: `3px solid ${phaseColor}`,
                      borderRadius: 8,
                      background: isActive ? phaseBg : 'var(--white)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = phaseColor
                        e.currentTarget.style.boxShadow  = '0 2px 8px rgba(0,0,0,0.06)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.boxShadow  = 'none'
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}>
                      <span style={{
                        fontSize: 10, fontFamily: 'monospace',
                        fontWeight: 700, color: phaseColor,
                      }}>
                        {mod.code ?? mod.id.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: phaseBg, color: phaseColor,
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        {mod.milestone ?? `Phase ${mod.phase}`}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: 'var(--navy)', lineHeight: 1.3,
                    }}>
                      {mod.label}
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
