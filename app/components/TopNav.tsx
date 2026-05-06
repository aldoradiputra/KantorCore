'use client'

import { CSSProperties, ReactNode } from 'react'

export type Page = 'roadmap' | 'docs' | 'learn'

type Props = {
  page: Page
  onChange: (page: Page) => void
  version: string
  onOpenSearch: () => void
}

const TABS: { id: Page; label: string; icon: ReactNode }[] = [
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" />
      </svg>
    ),
  },
  {
    id: 'docs',
    label: 'Docs',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m10 8 6 4-6 4V8z" fill="currentColor" />
      </svg>
    ),
  },
]

export default function TopNav({ page, onChange, version, onOpenSearch }: Props) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 20px',
      height: 56,
      borderBottom: '1px solid var(--border)',
      background: 'var(--white)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'var(--navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--white)',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '-0.3px',
        }}>
          IS
        </div>
        <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15, letterSpacing: '-0.3px' }}>
          Indonesia System
        </span>
      </div>

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
        {TABS.map(tab => {
          const active = page === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                border: '1px solid',
                borderColor: active ? 'var(--navy)' : 'var(--border)',
                background: active ? 'var(--navy)' : 'var(--white)',
                color: active ? 'var(--white)' : 'var(--slate)',
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget.style.background = 'var(--bg)')
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget.style.background = 'var(--white)')
              }}
            >
              <span style={{ display: 'flex', opacity: 0.85 }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </nav>

      <span style={{ flex: 1 }} />

      {/* Search */}
      <button
        onClick={onOpenSearch}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          height: 34,
          minWidth: 280,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          borderRadius: 7,
          color: 'var(--muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span style={{ fontSize: 13, flex: 1 }}>
          {page === 'docs' ? 'Search docs…' : page === 'learn' ? 'Search lessons…' : 'Search roadmap…'}
        </span>
        <kbd style={shortcutStyle}>⌘K</kbd>
      </button>

      {/* Locale */}
      <button style={iconButtonStyle}>
        EN <span style={{ fontSize: 9, marginLeft: 2 }}>▾</span>
      </button>

      {/* Ask Claude CTA */}
      <button style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 13px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        background: 'var(--indigo)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 7,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
        </svg>
        Ask Claude
      </button>

      {/* Version badge (replaces avatar — we don't have user accounts yet) */}
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--muted)',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 5,
        padding: '3px 7px',
        letterSpacing: '0.2px',
      }}>
        v{version}
      </span>
    </header>
  )
}

const iconButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 34,
  padding: '0 11px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  border: '1px solid var(--border)',
  background: 'var(--white)',
  color: 'var(--slate)',
  borderRadius: 7,
  cursor: 'pointer',
}

const shortcutStyle: CSSProperties = {
  fontSize: 10,
  fontFamily: 'inherit',
  fontWeight: 600,
  color: 'var(--muted)',
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '2px 5px',
}
