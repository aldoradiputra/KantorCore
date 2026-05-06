'use client'

import type { Node } from '../types'
import type { DocId } from './DocSidebar'

// ── Module display helpers ────────────────────────────────────────────────────

const ABBREV: Record<string, string> = {
  'platform-core':        'PC',
  'authentication':       'AU',
  'hr':                   'HR',
  'finance':              'FI',
  'workflow':             'WF',
  'procurement':          'PO',
  'sales':                'SL',
  'crm':                  'CR',
  'inventory':            'IV',
  'projects':             'PJ',
  'documents':            'DC',
  'chat':                 'CH',
  'email':                'EM',
  'mobile-pwa':           'MB',
  'meetings':             'MT',
  'omnichannel':          'OC',
  'manufacturing':        'MF',
  'helpdesk':             'HD',
  'knowledge':            'KN',
  'planning':             'PL',
  'fleet':                'FL',
  'events':               'EV',
  'surveys':              'SV',
  'subscriptions':        'SB',
  'marketing':            'MK',
  'okr':                  'OK',
  'conversational':       'CV',
  'compliance-automation':'CA',
  'ai-platform':          'AI',
  'ai-marketing':         'AM',
  'user-docs':            'UD',
  'elearning':            'EL',
  'marketplace':          'MP',
  'studio':               'ST',
  'industry-templates':   'IT',
  'b2b-network':          'BN',
  'ecommerce':            'EC',
  'iot':                  'IO',
  'field-service':        'FS',
  'plm':                  'PM',
  'public-sector':        'PS',
}

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

const RECENT_UPDATES = [
  { version: 'v0.8', date: '6 Mei 2026', note: 'Analytics Layer added to Platform Core (IS-PLAT-VIZ)' },
  { version: 'v0.7', date: '5 Mei 2026', note: 'Field Builder, App/Model Builder, Industry Templates' },
  { version: 'v0.6', date: '5 Mei 2026', note: 'Organization Structure — multi-company & branch (IS-PLAT-ORG)' },
  { version: 'v0.5', date: '4 Mei 2026', note: 'Platform Core with 8 primitives, Mobile PWA, Conversational, Marketplace' },
]

// ── Welcome page ─────────────────────────────────────────────────────────────

function WelcomePage({ nodes, version }: { nodes: Node[]; version: string }) {
  const modules = nodes
    .filter(n => n.type === 'module')
    .sort((a, b) => a.phase - b.phase)

  const QUICK_START_CARDS = [
    {
      tag:      'NEW HERE',
      title:    'Quick start',
      subtitle: 'Get the lay of the land in 5 minutes',
      color:    'var(--indigo)',
      bg:       'var(--indigo-light)',
    },
    {
      tag:      'USERS',
      title:    'Using the system',
      subtitle: 'HR, Finance, Procurement, and day-to-day operations',
      color:    'var(--teal)',
      bg:       'var(--teal-light)',
    },
    {
      tag:      'TEAM',
      title:    'Internal docs',
      subtitle: 'Architecture, Platform Core, ops and deployment',
      color:    'var(--amber)',
      bg:       'var(--amber-light)',
    },
  ]

  return (
    <div style={{ maxWidth: 860, padding: '40px 48px' }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.6px', marginBottom: 12, textTransform: 'uppercase' }}>
        Documentation · v{version}
      </p>

      <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.5px' }}>
        Welcome to Indonesia System
      </h1>

      <p style={{ fontSize: 15, color: 'var(--slate)', lineHeight: 1.65, marginBottom: 36, maxWidth: 600 }}>
        A national corporate operating system for Indonesia — HR, Finance, Procurement, Sales,
        and Operations in one platform, natively integrated with BPJS, CoreTax DJP, PrivyID,
        and QRIS.
      </p>

      {/* Quick start cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 44 }}>
        {QUICK_START_CARDS.map(card => (
          <div
            key={card.tag}
            style={{
              borderRadius: 10,
              border: '1px solid var(--border)',
              borderTop: `3px solid ${card.color}`,
              padding: '18px 20px 20px',
              cursor: 'pointer',
              background: 'var(--white)',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <p style={{ fontSize: 10, fontWeight: 700, color: card.color, letterSpacing: '0.7px', marginBottom: 8, textTransform: 'uppercase' }}>
              {card.tag}
            </p>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
              {card.title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
              {card.subtitle}
            </p>
            <span style={{ fontSize: 12, fontWeight: 600, color: card.color }}>Open →</span>
          </div>
        ))}
      </div>

      {/* Browse by module */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
        Browse by module
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 44 }}>
        {modules.map(mod => {
          const abbrev  = ABBREV[mod.id] ?? mod.id.slice(0, 2).toUpperCase()
          const color   = PHASE_COLOR[mod.phase] ?? 'var(--muted)'
          const bgColor = PHASE_BG[mod.phase]   ?? 'var(--bg)'
          return (
            <div
              key={mod.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'var(--white)',
                transition: 'border-color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 7,
                background: bgColor,
                border: `1px dashed ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 800,
                color,
                letterSpacing: '0.5px',
              }}>
                {abbrev}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>
                  {mod.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Phase {mod.phase}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent updates */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Recent updates</h2>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo)', cursor: 'pointer' }}>
          Changelog →
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {RECENT_UPDATES.map(u => (
          <div
            key={u.version}
            style={{
              display: 'flex',
              gap: 14,
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
              alignItems: 'baseline',
            }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--white)',
              background: 'var(--navy)',
              borderRadius: 4,
              padding: '2px 7px',
              flexShrink: 0,
            }}>
              {u.version}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{u.date}</span>
            <span style={{ fontSize: 12, color: 'var(--slate)', flex: 1 }}>{u.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stub page (all non-Welcome docs) ─────────────────────────────────────────

function StubPage({ id }: { id: string }) {
  const label = id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return (
    <div style={{ maxWidth: 680, padding: '40px 48px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.6px', marginBottom: 12, textTransform: 'uppercase' }}>
        Documentation
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', marginBottom: 16, letterSpacing: '-0.3px' }}>
        {label}
      </h1>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: 'var(--indigo-light)',
        border: '1px solid var(--indigo)',
        borderRadius: 8,
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 14 }}>✍️</span>
        <span style={{ fontSize: 13, color: 'var(--indigo)', fontWeight: 500 }}>
          This page is being written — content lands in Phase 3 of the docs build.
        </span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
        In the meantime, ask Claude on the right for answers about this module, or
        browse the roadmap to see all planned features.
      </p>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

type Props = { active: DocId; nodes: Node[]; version: string }

export default function DocContent({ active, nodes, version }: Props) {
  return (
    <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      {active === 'welcome'
        ? <WelcomePage nodes={nodes} version={version} />
        : <StubPage id={active} />
      }
    </main>
  )
}
