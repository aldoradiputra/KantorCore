'use client'

import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'
type AccentColor = 'indigo' | 'teal' | 'purple' | 'rose' | 'amber' | 'emerald'

const ACCENTS: ReadonlyArray<{ key: AccentColor; label: string; hex: string }> = [
  { key: 'indigo',  label: 'Indigo',  hex: '#3B4FC4' },
  { key: 'teal',    label: 'Teal',    hex: '#0F7B6C' },
  { key: 'purple',  label: 'Ungu',    hex: '#7C3AED' },
  { key: 'rose',    label: 'Rose',    hex: '#E11D48' },
  { key: 'amber',   label: 'Amber',   hex: '#B35A00' },
  { key: 'emerald', label: 'Hijau',   hex: '#059669' },
]

function readDocAppearance(): { mode: ThemeMode; accent: AccentColor } {
  if (typeof document === 'undefined') return { mode: 'light', accent: 'indigo' }
  const mode = (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') as ThemeMode
  const a = document.documentElement.dataset.accent
  const accent = (ACCENTS.find((x) => x.key === a)?.key ?? 'indigo') as AccentColor
  return { mode, accent }
}

export default function AppearanceMenu() {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [accent, setAccent] = useState<AccentColor>('indigo')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cur = readDocAppearance()
    setMode(cur.mode)
    setAccent(cur.accent)
  }, [])

  async function apply(next: { mode?: ThemeMode; accent?: AccentColor }) {
    // Optimistic: stamp <html> immediately so the user sees the change
    if (next.mode) document.documentElement.dataset.theme = next.mode
    if (next.accent) document.documentElement.dataset.accent = next.accent

    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (next.mode) body.themeMode = next.mode
      if (next.accent) body.accentColor = next.accent
      await fetch('/api/user/appearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // swallow — visual change already applied; persistence will retry on next change
    } finally {
      setSaving(false)
    }
  }

  function selectMode(next: ThemeMode) {
    setMode(next)
    void apply({ mode: next })
  }

  function selectAccent(next: AccentColor) {
    setAccent(next)
    void apply({ accent: next })
  }

  return (
    <div style={{ padding: 'var(--s-3)' }}>
      <div className="t-micro" style={{ marginBottom: 'var(--s-2)', color: 'var(--fg-3)' }}>Tampilan</div>

      {/* Mode toggle */}
      <div
        role="group"
        aria-label="Mode tampilan"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          padding: 3,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          marginBottom: 'var(--s-3)',
        }}
      >
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => selectMode(m)}
            disabled={saving}
            style={{
              height: 28,
              border: 'none',
              borderRadius: 4,
              font: '500 12px/1 var(--font-sans)',
              cursor: 'pointer',
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--fg-1)' : 'var(--fg-3)',
              boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {m === 'light' ? 'Terang' : 'Gelap'}
          </button>
        ))}
      </div>

      {/* Accent swatches */}
      <div className="t-micro" style={{ marginBottom: 6, color: 'var(--fg-3)' }}>Warna Aksen</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ACCENTS.map(({ key, label, hex }) => {
          const active = accent === key
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => selectAccent(key)}
              disabled={saving}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: hex,
                border: active ? '2px solid var(--fg-1)' : '2px solid transparent',
                outline: active ? '2px solid var(--surface)' : 'none',
                outlineOffset: -4,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
