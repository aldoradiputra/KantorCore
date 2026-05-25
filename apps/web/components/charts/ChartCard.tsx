'use client'

import type { ReactNode } from 'react'

interface Control {
  label: string
  value: string
  active: boolean
  onClick: () => void
}

interface Props {
  title: string
  subtitle?: string
  controls?: Control[]
  children: ReactNode
  style?: React.CSSProperties
}

export function ChartCard({ title, subtitle, controls, children, style }: Props) {
  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding:      'var(--s-4)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--s-3)', gap: 'var(--s-3)' }}>
        <div>
          <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{title}</div>
          {subtitle && (
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>{subtitle}</div>
          )}
        </div>
        {controls && controls.length > 0 && (
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden', flexShrink: 0 }}>
            {controls.map((c, i) => (
              <button
                key={c.value}
                onClick={c.onClick}
                style={{
                  padding:     '4px 10px',
                  border:      'none',
                  borderRight: i < controls.length - 1 ? '1px solid var(--border)' : 'none',
                  background:  c.active ? 'var(--indigo)' : 'var(--surface)',
                  color:       c.active ? 'white' : 'var(--fg-3)',
                  font:        '11px/1 var(--font-sans)',
                  cursor:      'pointer',
                  transition:  'background var(--d-fast), color var(--d-fast)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
