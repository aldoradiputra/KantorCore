'use client'

import { CSSProperties } from 'react'
import { STRINGS } from '../locale-context'

type Props = {
  version: string
  onOpenSearch: () => void
  locale: 'en' | 'id'
  onLocaleToggle: () => void
}

export default function TopNav({ version, onOpenSearch, locale, onLocaleToggle }: Props) {
  const s = STRINGS[locale]

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
        <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 13, letterSpacing: '-0.2px', marginLeft: 4 }}>
          {s.roadmap}
        </span>
      </div>

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
          minWidth: 260,
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
        <span style={{ fontSize: 13, flex: 1 }}>{s.searchPlaceholder}</span>
        <kbd style={shortcutStyle}>⌘K</kbd>
      </button>

      {/* Locale toggle */}
      <button onClick={onLocaleToggle} style={iconButtonStyle} title={locale === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}>
        {locale === 'en' ? 'EN' : 'ID'} <span style={{ fontSize: 9, marginLeft: 2 }}>▾</span>
      </button>

      {/* Version badge */}
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
