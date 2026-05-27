'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'

// ── Types ─────────────────────────────────────────────────────
export type NavModuleId =
  | 'home' | 'chat' | 'proj' | 'time' | 'doc' | 'proses'
  | 'crm' | 'sales' | 'proc' | 'inv' | 'fin' | 'hr' | 'pay' | 'rent'
  | 'aip' | 'agent' | 'trig' | 'mig' | 'ops'
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

// ── Storage keys ──────────────────────────────────────────────
const EXPAND_KEY = 'kc-sidebar-expanded'
const ORDER_KEY  = 'kc-sidebar-order'

const EXPANDED_W  = 200
const COLLAPSED_W = 56

// ── Helpers: persisted order map ──────────────────────────────
function readOrder(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeOrder(map: Record<string, string[]>) {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(map)) } catch { /* noop */ }
}

function applyOrder(groups: NavGroup[], orderMap: Record<string, string[]>): NavGroup[] {
  return groups.map((g) => {
    const saved = orderMap[g.id]
    if (!saved) return g
    const byId = new Map(g.items.map((item) => [item.id, item]))
    const ordered: NavEntry[] = []
    for (const id of saved) {
      const item = byId.get(id as NavModuleId)
      if (item) ordered.push(item)
    }
    // Append newly-added items not present in the saved order
    for (const item of g.items) {
      if (!ordered.includes(item)) ordered.push(item)
    }
    return { ...g, items: ordered }
  })
}

// ── Icons ─────────────────────────────────────────────────────
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
  groups: initialGroups,
  activeModule,
  settingsHref,
}: {
  groups: NavGroup[]
  activeModule: NavModuleId | null
  settingsHref: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [ready, setReady]       = useState(false)
  const [groups, setGroups]     = useState<NavGroup[]>(initialGroups)

  // dragItem: which item is being dragged { groupId, fromIdx }
  const dragItem = useRef<{ groupId: string; fromIdx: number } | null>(null)
  // dropTarget: where the blue indicator should render { groupId, toIdx }
  const [dropTarget, setDropTarget] = useState<{ groupId: string; toIdx: number } | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(EXPAND_KEY) === 'true') setExpanded(true)
      setGroups(applyOrder(initialGroups, readOrder()))
    } catch { /* noop */ }
    setReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    setExpanded((v) => {
      const next = !v
      try { localStorage.setItem(EXPAND_KEY, String(next)) } catch { /* noop */ }
      return next
    })
  }

  // ── DnD handlers ────────────────────────────────────────────
  function onDragStart(groupId: string, fromIdx: number) {
    dragItem.current = { groupId, fromIdx }
  }

  function onDragOver(e: React.DragEvent, groupId: string, toIdx: number) {
    e.preventDefault()
    if (dragItem.current?.groupId !== groupId) return
    setDropTarget({ groupId, toIdx })
  }

  function onDragLeave() {
    setDropTarget(null)
  }

  function onDrop(e: React.DragEvent, groupId: string, toIdx: number) {
    e.preventDefault()
    setDropTarget(null)
    const src = dragItem.current
    dragItem.current = null
    if (!src || src.groupId !== groupId || src.fromIdx === toIdx) return

    setGroups((prev) => {
      const next = prev.map((g) => {
        if (g.id !== groupId) return g
        const items = [...g.items]
        const [moved] = items.splice(src.fromIdx, 1)
        const insertAt = toIdx > src.fromIdx ? toIdx - 1 : toIdx
        items.splice(insertAt, 0, moved)
        return { ...g, items }
      })
      const orderMap = readOrder()
      const updated = next.find((g) => g.id === groupId)
      if (updated) orderMap[groupId] = updated.items.map((i) => i.id)
      writeOrder(orderMap)
      return next
    })
  }

  function onDragEnd() {
    dragItem.current = null
    setDropTarget(null)
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
        <div key={group.id} style={{ display: 'flex', flexDirection: 'column', alignItems: expanded ? 'stretch' : 'center', width: '100%' }}>
          {gi > 0 && (
            <div aria-hidden style={{ height: 1, background: 'var(--border)', margin: expanded ? '6px 12px' : '6px 16px' }} />
          )}

          {expanded && (
            <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 14px 4px' }}>
              {group.label}
            </div>
          )}

          {group.items.map((item, idx) => {
            const { id, label, href, hotkey, Icon } = item
            const active   = activeModule === id
            const showTop  = dropTarget?.groupId === group.id && dropTarget.toIdx === idx
            const showBot  = dropTarget?.groupId === group.id && dropTarget.toIdx === group.items.length && idx === group.items.length - 1

            return (
              <div
                key={id}
                draggable
                onDragStart={() => onDragStart(group.id, idx)}
                onDragOver={(e) => onDragOver(e, group.id, idx)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, group.id, idx)}
                onDragEnd={onDragEnd}
                style={{
                  position: 'relative',
                  borderTop: showTop ? '2px solid var(--indigo)' : '2px solid transparent',
                  borderBottom: showBot ? '2px solid var(--indigo)' : '2px solid transparent',
                }}
              >
                <Link
                  href={href}
                  title={expanded ? undefined : `${label} · ${group.label} (${hotkey})`}
                  aria-label={`${label} (${hotkey})`}
                  aria-current={active ? 'page' : undefined}
                  draggable={false}
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
                    userSelect: 'none',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><Icon /></span>
                  {expanded && (
                    <span style={{ font: '500 13px/1 var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                  )}
                </Link>
              </div>
            )
          })}

          {/* Drop zone after the last item */}
          <div
            onDragOver={(e) => onDragOver(e, group.id, group.items.length)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, group.id, group.items.length)}
            style={{
              height: 4,
              borderTop: dropTarget?.groupId === group.id && dropTarget.toIdx === group.items.length
                ? '2px solid var(--indigo)'
                : '2px solid transparent',
            }}
          />
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <Link
        href={settingsHref}
        title={expanded ? undefined : 'Pengaturan'}
        aria-label="Pengaturan"
        style={{
          display: 'flex', alignItems: 'center', gap: expanded ? 10 : 0,
          height: 36, padding: expanded ? '0 12px' : '0',
          margin: expanded ? '0 4px' : '0 auto', width: expanded ? 'auto' : 40,
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 'var(--r-md)', color: 'var(--fg-3)', textDecoration: 'none',
          whiteSpace: 'nowrap', transition: `background var(--d-fast) var(--ease), color var(--d-fast) var(--ease)`,
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><IconCog /></span>
        {expanded && <span style={{ font: '500 13px/1 var(--font-sans)' }}>Pengaturan</span>}
      </Link>

      <button
        type="button" onClick={toggle}
        title={expanded ? 'Ciutkan panel' : 'Perluas panel'}
        aria-label={expanded ? 'Ciutkan panel navigasi' : 'Perluas panel navigasi'}
        style={{
          display: 'flex', alignItems: 'center', gap: expanded ? 10 : 0,
          height: 36, padding: expanded ? '0 12px' : '0',
          margin: expanded ? '0 4px' : '0 auto', width: expanded ? 'auto' : 40,
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 'var(--r-md)', color: 'var(--fg-3)', background: 'transparent',
          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {expanded ? <IconChevronLeft /> : <IconChevronRight />}
        </span>
        {expanded && <span style={{ font: '500 13px/1 var(--font-sans)' }}>Ciutkan</span>}
      </button>
    </nav>
  )
}
