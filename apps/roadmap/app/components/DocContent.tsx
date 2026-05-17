'use client'

import type { Node } from '../types'
import type { DocId } from './DocSidebar'
import { DOCS_MAP, type Block, type DocPage } from '../docs-content'
import { useLocale, STRINGS } from '../locale-context'

// ── Module display helpers (Welcome page) ────────────────────────────────────

const ABBREV: Record<string, string> = {
  'platform-core': 'PC', 'authentication': 'AU', 'hr': 'HR', 'finance': 'FI',
  'workflow': 'WF', 'procurement': 'PO', 'sales': 'SL', 'crm': 'CR',
  'inventory': 'IV', 'projects': 'PJ', 'documents': 'DC', 'chat': 'CH',
  'email': 'EM', 'mobile-pwa': 'MB', 'meetings': 'MT', 'omnichannel': 'OC',
  'manufacturing': 'MF', 'helpdesk': 'HD', 'knowledge': 'KN', 'planning': 'PL',
  'fleet': 'FL', 'events': 'EV', 'surveys': 'SV', 'subscriptions': 'SB',
  'marketing': 'MK', 'okr': 'OK', 'conversational': 'CV',
  'compliance-automation': 'CA', 'ai-platform': 'AI', 'ai-marketing': 'AM',
  'user-docs': 'UD', 'elearning': 'EL', 'marketplace': 'MP', 'studio': 'ST',
  'industry-templates': 'IT', 'b2b-network': 'BN', 'ecommerce': 'EC',
  'iot': 'IO', 'field-service': 'FS', 'plm': 'PM', 'public-sector': 'PS',
}
const PHASE_COLOR: Record<number, string> = { 1: 'var(--indigo)', 2: 'var(--teal)', 3: 'var(--amber)' }
const PHASE_BG:    Record<number, string> = { 1: 'var(--indigo-light)', 2: 'var(--teal-light)', 3: 'var(--amber-light)' }

const RECENT_UPDATES = [
  { version: 'v0.8', date: '6 Mei 2026',  note: 'Analytics Layer added to Platform Core (IS-PLAT-VIZ)' },
  { version: 'v0.7', date: '5 Mei 2026',  note: 'Field Builder, App/Model Builder, Industry Templates' },
  { version: 'v0.6', date: '5 Mei 2026',  note: 'Organization Structure — multi-company & branch (IS-PLAT-ORG)' },
  { version: 'v0.5', date: '4 Mei 2026',  note: 'Platform Core with 8 primitives, Mobile PWA, Conversational, Marketplace' },
]

// ── Block renderer ───────────────────────────────────────────────────────────

const CALLOUT_STYLES: Record<string, { bg: string; border: string; labelColor: string; label: string }> = {
  info:    { bg: 'var(--indigo-light)', border: 'var(--indigo)', labelColor: 'var(--indigo)', label: 'Note' },
  warning: { bg: 'var(--amber-light)',  border: 'var(--amber)',  labelColor: 'var(--amber)',  label: 'Important' },
  tip:     { bg: 'var(--teal-light)',   border: 'var(--teal)',   labelColor: 'var(--teal)',   label: 'Tip' },
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case 'h2':
      return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', margin: '32px 0 10px', letterSpacing: '-0.2px' }}>{block.text}</h2>
    case 'h3':
      return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', margin: '22px 0 8px' }}>{block.text}</h3>
    case 'p':
      return <p key={i} style={{ fontSize: 14, color: 'var(--slate)', lineHeight: 1.75, margin: '0 0 14px' }}>{block.text}</p>
    case 'ul':
      return (
        <ul key={i} style={{ margin: '0 0 14px', paddingLeft: 20 }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ fontSize: 14, color: 'var(--slate)', lineHeight: 1.7, marginBottom: 5 }}>{item}</li>
          ))}
        </ul>
      )
    case 'callout': {
      const s = CALLOUT_STYLES[block.variant]
      return (
        <div key={i} style={{
          background: s.bg, borderLeft: `3px solid ${s.border}`,
          borderRadius: '0 8px 8px 0', padding: '12px 16px', margin: '0 0 16px',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: s.labelColor, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {block.title ?? s.label}
          </p>
          <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.65, margin: 0 }}>{block.text}</p>
        </div>
      )
    }
    case 'code':
      return (
        <pre key={i} style={{
          background: 'var(--navy)', color: '#e2e8f0', borderRadius: 8,
          padding: '16px 18px', fontSize: 12, lineHeight: 1.65, overflowX: 'auto',
          margin: '0 0 16px', fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
          whiteSpace: 'pre',
        }}>
          {block.text}
        </pre>
      )
    case 'table':
      return (
        <div key={i} style={{ overflowX: 'auto', margin: '0 0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {block.headers.map((h, j) => (
                  <th key={j} style={{
                    textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid var(--border)',
                    fontWeight: 700, color: 'var(--navy)', fontSize: 12, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j} style={{ background: j % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                  {row.map((cell, k) => (
                    <td key={k} style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--slate)', lineHeight: 1.5 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'divider':
      return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '28px 0' }} />
    default:
      return null
  }
}

// ── Structured page renderer ──────────────────────────────────────────────────

function StructuredPage({ page }: { page: DocPage }) {
  return (
    <div style={{ maxWidth: 760, padding: '40px 48px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.6px', marginBottom: 10, textTransform: 'uppercase' }}>
        {page.breadcrumb ?? 'Documentation'}
        {page.code && <span style={{ marginLeft: 10, color: 'var(--indigo)' }}>{page.code}</span>}
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, marginBottom: 14, letterSpacing: '-0.4px' }}>
        {page.title}
      </h1>
      {(page.milestone || page.phase) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {page.phase && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5,
              background: PHASE_BG[page.phase] ?? 'var(--bg)',
              color: PHASE_COLOR[page.phase] ?? 'var(--muted)',
              border: `1px solid ${PHASE_COLOR[page.phase] ?? 'var(--border)'}`,
            }}>Phase {page.phase}</span>
          )}
          {page.milestone && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5,
              background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)',
            }}>{page.milestone}</span>
          )}
        </div>
      )}
      <p style={{ fontSize: 15, color: 'var(--slate)', lineHeight: 1.7, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        {page.intro}
      </p>
      {page.blocks.map((block, i) => renderBlock(block, i))}
    </div>
  )
}

// ── Welcome page ─────────────────────────────────────────────────────────────

function WelcomePage({ nodes, version, onNavigate }: { nodes: Node[]; version: string; onNavigate: (id: string) => void }) {
  const locale = useLocale()
  const s = STRINGS[locale]
  const modules = nodes.filter(n => n.type === 'module').sort((a, b) => a.phase - b.phase)

  const CARD_DESTS = ['getting-started', 'hr', 'concepts-architecture']
  const CARD_COLORS = ['var(--indigo)', 'var(--teal)', 'var(--amber)']

  return (
    <div style={{ maxWidth: 860, padding: '40px 48px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.6px', marginBottom: 12, textTransform: 'uppercase' }}>
        {s.welcomeSuper} · v{version}
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.5px' }}>
        {s.welcomeTitle}
      </h1>
      <p style={{ fontSize: 15, color: 'var(--slate)', lineHeight: 1.65, marginBottom: 36, maxWidth: 600 }}>
        {s.welcomeIntro}
      </p>

      {/* Quick start cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 44 }}>
        {s.quickStartCards.map((card, i) => (
          <div key={card.tag} onClick={() => onNavigate(CARD_DESTS[i])} style={{
            borderRadius: 10, border: '1px solid var(--border)',
            borderTop: `3px solid ${CARD_COLORS[i]}`, padding: '18px 20px 20px',
            cursor: 'pointer', background: 'var(--white)', transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <p style={{ fontSize: 10, fontWeight: 700, color: CARD_COLORS[i], letterSpacing: '0.7px', marginBottom: 8, textTransform: 'uppercase' }}>{card.tag}</p>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{card.title}</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>{card.sub}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: CARD_COLORS[i] }}>{s.open}</span>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>{s.browseByModule}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 44 }}>
        {modules.map(mod => {
          const abbrev = ABBREV[mod.id] ?? mod.id.slice(0, 2).toUpperCase()
          const color  = PHASE_COLOR[mod.phase] ?? 'var(--muted)'
          const bg     = PHASE_BG[mod.phase] ?? 'var(--bg)'
          return (
            <div key={mod.id} onClick={() => onNavigate(mod.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer', background: 'var(--white)',
              transition: 'border-color 0.12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 7, background: bg,
                border: `1px dashed ${color}`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800,
                color, letterSpacing: '0.5px',
              }}>{abbrev}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>{mod.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.phase} {mod.phase}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent updates */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{s.recentUpdates}</h2>
        <span onClick={() => onNavigate('changelog')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo)', cursor: 'pointer' }}>{s.changelogLink}</span>
      </div>
      {RECENT_UPDATES.map(u => (
        <div key={u.version} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--white)', background: 'var(--navy)', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
            {u.version}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{u.date}</span>
          <span style={{ fontSize: 12, color: 'var(--slate)', flex: 1 }}>{u.note}</span>
        </div>
      ))}
    </div>
  )
}

// ── Stub page ─────────────────────────────────────────────────────────────────

function StubPage({ id }: { id: string }) {
  const label = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return (
    <div style={{ maxWidth: 680, padding: '40px 48px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.6px', marginBottom: 12, textTransform: 'uppercase' }}>Documentation</p>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', marginBottom: 16, letterSpacing: '-0.3px' }}>{label}</h1>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--indigo-light)', border: '1px solid var(--indigo)', borderRadius: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 13 }}>✍️</span>
        <span style={{ fontSize: 13, color: 'var(--indigo)', fontWeight: 500 }}>Content for this page lands in the next docs sprint.</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
        Ask Claude on the right for immediate answers about this module — it has access to the full feature list and architecture decisions.
      </p>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

type Props = { active: DocId; nodes: Node[]; version: string; onNavigate: (id: string) => void }

export default function DocContent({ active, nodes, version, onNavigate }: Props) {
  const page = DOCS_MAP[active]
  return (
    <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      {active === 'welcome'
        ? <WelcomePage nodes={nodes} version={version} onNavigate={onNavigate} />
        : page
          ? <StructuredPage page={page} />
          : <StubPage id={active} />
      }
    </main>
  )
}
