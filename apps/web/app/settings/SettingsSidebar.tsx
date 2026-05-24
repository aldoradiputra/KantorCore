'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface SettingsNavItem {
  section: string
  label: string
  href: string
  group: string
}

export function SettingsSidebar({
  items,
  activeSection,
}: {
  items: SettingsNavItem[]
  activeSection: string
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return items
    const needle = q.toLowerCase()
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(needle) ||
        i.group.toLowerCase().includes(needle) ||
        i.section.toLowerCase().includes(needle),
    )
  }, [items, q])

  // Re-group filtered items, preserving original group order
  const groups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, SettingsNavItem[]>()
    for (const it of filtered) {
      if (!map.has(it.group)) {
        map.set(it.group, [])
        order.push(it.group)
      }
      map.get(it.group)!.push(it)
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }))
  }, [filtered])

  return (
    <div
      style={{
        padding: 'var(--s-3) var(--s-4) var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari pengaturan…"
        style={{
          height: 32,
          padding: '0 10px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          font: '13px/1 var(--font-sans)',
          color: 'var(--fg-1)',
          background: 'var(--bg)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      {groups.length === 0 ? (
        <div style={{ padding: '12px 6px', font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
          Tidak ditemukan.
        </div>
      ) : (
        groups.map(({ group, items: gItems }) => (
          <div key={group}>
            <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>
              {group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {gItems.map((item) => {
                const active = item.section === activeSection
                return (
                  <Link
                    key={item.section}
                    href={item.href}
                    style={{
                      height: 32,
                      padding: '0 8px',
                      borderRadius: 'var(--r-sm)',
                      font: '500 13px/32px var(--font-sans)',
                      color: active ? 'var(--indigo)' : 'var(--fg-2)',
                      background: active ? 'var(--indigo-light)' : 'transparent',
                      textDecoration: 'none',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
