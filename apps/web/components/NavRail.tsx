'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

// ── Types (mirrors AppShell's internal types) ─────────────────
export type NavModuleId =
  | 'home' | 'chat' | 'proj' | 'time' | 'doc' | 'proses'
  | 'crm' | 'sales' | 'proc' | 'inv' | 'fin' | 'hr' | 'pay' | 'rent'
  | 'aip' | 'agent' | 'trig' | 'mig'
  | 'gamification' | 'recruitment'

export interface NavEntry {
  id: NavModuleId
  label: string
  href: string
  hotkey: string
  Icon: () => ReactElement
}

export interface NavGroup {
  id: string
  label: string
  items: NavEntry[]
}

const STORAGE_KEY = 'kc-sidebar-expanded'
const EXPANDED_W  = 200
const COLLAPSED_W = 56

// ── Icons used only in the rail ───────────────────────────────
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2l4 5-4 5" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L5 7l4 5" />
    </svg>
  )
}

function IconCog() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.5v2.5M10 16v2.5M3.5 3.5l1.8 1.8M14.7 14.7l1.8 1.8M1.5 10h2.5M16 10h2.5M3.5 16.5l1.8-1.8M14.7 5.3l1.8-1.8" />
    </svg>
  )
}

// ── NavRail ───────────────────────────────────────────────────
export default function NavRail({
  groups,
  activeModule,
  settingsHref,
}: {
  groups: NavGroup[]
  activeModule: NavModuleId | null
  settingsHref: string
}) {
  // Start collapsed; hydrate from localStorage after mount to avoid SSR mismatch.
  const [expanded, setExpanded] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setExpanded(true)
    } catch {
      /* localStorage not available */
    }
    setReady(true)
  }, [])

  function toggle() {
    setExpanded((v) => {
      const next = !v
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* noop */ }
      return next
    })
  }

  const w = expanded ? EXPANDED_W : COLLAPSED_W

  return (
    <nav
      aria-label="Navigasi utama"
      style={{
        width: ready ? w : COLLAPSED_W,
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        paddingTop: 'var(--s-3)',
        paddingBottom: 'var(--s-3)',
        gap: 2,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}
    >
      {groups.map((group, gi) => (
        <div
          key={group.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: expanded ? 'stretch' : 'center',
            gap: 2,
            width: '100%',
          }}
        >
          {/* Separator between groups */}
          {gi > 0 && (
            <div
              aria-hidden
              style={{
                height: 1,
                background: 'var(--border)',
                margin: expanded ? '6px 12px' : '6px 16px',
              }}
            />
          )}

          {/* Section label — only visible when expanded */}
          {expanded && (
            <div
              style={{
                font: '600 10px/1 var(--font-sans)',
                color: 'var(--fg-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 14px 4px',
              }}
            >
              {group.label}
            </div>
          )}

          {/* Nav items */}
          {group.items.map(({ id, label, href, hotkey, Icon }) => {
            const active = activeModule === id
            return (
              <Link
                key={id}
                href={href}
                title={expanded ? undefined : `${label} · ${group.label} (${hotkey})`}
                aria-label={`${label} (${hotkey})`}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: expanded ? 10 : 0,
                  height: 36,
                  padding: expanded ? '0 12px' : '0',
                  margin: expanded ? '0 4px' : '0 auto',
                  width: expanded ? 'auto' : 40,
                  justifyContent: expanded ? 'flex-start' : 'center',
                  borderRadius: 'var(--r-md)',
                  color: active ? 'var(--indigo)' : 'var(--fg-3)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: `background var(--d-fast) var(--ease), color var(--d-fast) var(--ease)`,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <Icon />
                </span>
                {expanded && (
                  <span style={{ font: '500 13px/1 var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}

      {/* Spacer + bottom controls */}
      <div style={{ flex: 1 }} />

      {/* Settings */}
      <Link
        href={settingsHref}
        title={expanded ? undefined : 'Pengaturan'}
        aria-label="Pengaturan"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? 10 : 0,
          height: 36,
          padding: expanded ? '0 12px' : '0',
          margin: expanded ? '0 4px' : '0 auto',
          width: expanded ? 'auto' : 40,
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 'var(--r-md)',
          color: 'var(--fg-3)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          transition: `background var(--d-fast) var(--ease), color var(--d-fast) var(--ease)`,
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <IconCog />
        </span>
        {expanded && (
          <span style={{ font: '500 13px/1 var(--font-sans)' }}>Pengaturan</span>
        )}
      </Link>

      {/* Expand / collapse toggle */}
      <button
        type="button"
        onClick={toggle}
        title={expanded ? 'Ciutkan panel' : 'Perluas panel'}
        aria-label={expanded ? 'Ciutkan panel navigasi' : 'Perluas panel navigasi'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? 10 : 0,
          height: 36,
          padding: expanded ? '0 12px' : '0',
          margin: expanded ? '0 4px' : '0 auto',
          width: expanded ? 'auto' : 40,
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 'var(--r-md)',
          color: 'var(--fg-3)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {expanded ? <IconChevronLeft /> : <IconChevronRight />}
        </span>
        {expanded && (
          <span style={{ font: '500 13px/1 var(--font-sans)' }}>Ciutkan</span>
        )}
      </button>
    </nav>
  )
}
