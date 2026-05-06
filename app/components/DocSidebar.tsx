'use client'

import { useState } from 'react'

export type DocId = string

type Item = { id: DocId; label: string }
type Section = {
  id: string
  label: string
  phase?: 1 | 2 | 3
  collapsible?: boolean
  defaultOpen?: boolean
  items: Item[]
}

const SECTIONS: Section[] = [
  {
    id: 'general',
    label: '',
    items: [
      { id: 'welcome',         label: 'Welcome' },
      { id: 'getting-started', label: 'Getting started' },
      { id: 'concepts',        label: 'Concepts' },
    ],
  },
  {
    id: 'phase1',
    label: 'PHASE 1 — FOUNDATION',
    phase: 1,
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'platform-core',  label: 'Platform Core' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'hr',             label: 'HR & Employees' },
      { id: 'finance',        label: 'Finance' },
      { id: 'workflow',       label: 'Workflow Engine' },
      { id: 'procurement',    label: 'Procurement' },
      { id: 'sales',          label: 'Sales' },
      { id: 'crm',            label: 'CRM' },
      { id: 'inventory',      label: 'Inventory' },
      { id: 'projects',       label: 'Projects' },
      { id: 'documents',      label: 'Documents' },
      { id: 'chat',           label: 'Chat' },
      { id: 'mobile-pwa',     label: 'Mobile PWA' },
    ],
  },
  {
    id: 'phase2',
    label: 'PHASE 2 — EXPANSION',
    phase: 2,
    collapsible: true,
    defaultOpen: false,
    items: [
      { id: 'conversational',         label: 'Conversational' },
      { id: 'compliance-automation',  label: 'Compliance Automation' },
      { id: 'ai-platform',            label: 'AI Platform' },
      { id: 'email',                  label: 'Email' },
      { id: 'meetings',               label: 'Meetings' },
      { id: 'omnichannel',            label: 'Omnichannel' },
      { id: 'manufacturing',          label: 'Manufacturing' },
      { id: 'helpdesk',               label: 'Helpdesk' },
      { id: 'knowledge',              label: 'Knowledge' },
    ],
  },
  {
    id: 'phase3',
    label: 'PHASE 3 — SCALE',
    phase: 3,
    collapsible: true,
    defaultOpen: false,
    items: [
      { id: 'marketplace',         label: 'Marketplace' },
      { id: 'studio',              label: 'Studio' },
      { id: 'industry-templates',  label: 'Industry Templates' },
      { id: 'ai-marketing',        label: 'AI Marketing' },
      { id: 'ecommerce',           label: 'E-Commerce' },
    ],
  },
  {
    id: 'meta',
    label: '',
    items: [
      { id: 'changelog', label: 'Changelog' },
    ],
  },
]

const PHASE_COLORS: Record<number, string> = {
  1: 'var(--indigo)',
  2: 'var(--teal)',
  3: 'var(--amber)',
}

type Props = {
  active: DocId
  onChange: (id: DocId) => void
}

export default function DocSidebar({ active, onChange }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map(s => [s.id, s.defaultOpen ?? true]))
  )

  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      borderRight: '1px solid var(--border)',
      overflowY: 'auto',
      padding: '16px 0',
      background: 'var(--white)',
    }}>
      {SECTIONS.map(section => (
        <div key={section.id} style={{ marginBottom: 4 }}>
          {/* Section header */}
          {section.label && (
            <button
              onClick={() => section.collapsible && toggle(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '5px 20px',
                border: 'none',
                background: 'none',
                cursor: section.collapsible ? 'pointer' : 'default',
                textAlign: 'left',
                marginBottom: 2,
              }}
            >
              {section.phase && (
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: PHASE_COLORS[section.phase],
                  flexShrink: 0,
                }} />
              )}
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                flex: 1,
              }}>
                {section.label}
              </span>
              {section.collapsible && (
                <span style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  transform: open[section.id] ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                  display: 'inline-block',
                }}>
                  ›
                </span>
              )}
            </button>
          )}

          {/* Items */}
          {(!section.collapsible || open[section.id]) && section.items.map(item => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 20px 6px 28px',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--navy)' : 'var(--slate)',
                  background: isActive ? 'var(--indigo-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: isActive ? '2px solid var(--indigo)' : '2px solid transparent',
                  transition: 'background 0.1s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {item.label}
              </button>
            )
          })}

          {section.id === 'general' && (
            <div style={{ height: 12, borderBottom: '1px solid var(--border)', marginBottom: 12 }} />
          )}
        </div>
      ))}
    </aside>
  )
}
