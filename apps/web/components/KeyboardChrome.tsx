'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchHit {
  type: 'channel' | 'project'
  id: string
  label: string
  hint: string
  href: string
}

const HOTKEY_WINDOW_MS = 1200

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

const OPEN_PALETTE_EVENT = 'kantr:open-palette'

export function SearchTrigger() {
  function open() {
    window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))
  }
  return (
    <button
      type="button"
      onClick={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        background: 'var(--bg)',
        font: '500 12px/1 var(--font-sans)',
        color: 'var(--fg-3)',
        cursor: 'pointer',
      }}
    >
      <span>Cari</span>
      <kbd
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          padding: '2px 5px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: 'var(--fg-3)',
        }}
      >
        ⌘K
      </kbd>
    </button>
  )
}

export default function KeyboardChrome() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const leaderAt = useRef(0)

  // SearchTrigger (or any other component) can request the palette via event.
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, onOpen)
  }, [])

  // Global hotkeys: ⌘K / Ctrl+K to open palette; G then H/C/P to route.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Palette: works even while typing (it's an editor escape hatch).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }

      if (isTypingTarget(e.target)) return

      const k = e.key.toLowerCase()
      if (k === 'g') {
        leaderAt.current = Date.now()
        return
      }
      if (Date.now() - leaderAt.current < HOTKEY_WINDOW_MS) {
        if (k === 'h') {
          leaderAt.current = 0
          router.push('/')
        } else if (k === 'c') {
          leaderAt.current = 0
          router.push('/chat')
        } else if (k === 'p') {
          leaderAt.current = 0
          router.push('/proj')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  if (!open) return null
  return <Palette onClose={() => setOpen(false)} />
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced fetch. Empty query → no results.
  useEffect(() => {
    if (!q.trim()) {
      setHits([])
      setActive(0)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = (await res.json()) as { hits: SearchHit[] }
        setHits(data.hits)
        setActive(0)
      } catch {
        /* network blip */
      }
    }, 120)
    return () => clearTimeout(t)
  }, [q])

  const select = useCallback(
    (hit: SearchHit) => {
      onClose()
      router.push(hit.href)
    },
    [router, onClose],
  )

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[active]
      if (hit) select(hit)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.32)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kanal, proyek…"
          style={{
            width: '100%',
            height: 48,
            padding: '0 var(--s-4)',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            font: '400 15px/1 var(--font-sans)',
            color: 'var(--fg-1)',
            outline: 'none',
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 'var(--s-2) 0' }}>
          {q.trim() === '' ? (
            <Empty>Ketik untuk mencari kanal atau proyek.</Empty>
          ) : hits.length === 0 ? (
            <Empty>Tidak ada hasil.</Empty>
          ) : (
            hits.map((hit, i) => (
              <button
                key={`${hit.type}-${hit.id}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => select(hit)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: 40,
                  padding: '0 var(--s-4)',
                  border: 'none',
                  background: i === active ? 'var(--indigo-light)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                  <TypeBadge type={hit.type} />
                  <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                    {hit.label}
                  </span>
                  <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {hit.hint}
                  </span>
                </span>
                <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-3)' }}>
                  ↵
                </span>
              </button>
            ))
          )}
        </div>
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '8px var(--s-4)',
            display: 'flex',
            gap: 'var(--s-4)',
            font: '500 11px/1 var(--font-sans)',
            color: 'var(--fg-3)',
            background: 'var(--bg)',
          }}
        >
          <Hint k="↑↓" label="Navigasi" />
          <Hint k="↵" label="Buka" />
          <Hint k="Esc" label="Tutup" />
          <div style={{ flex: 1 }} />
          <Hint k="G H/C/P" label="Lompat modul" />
        </div>
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 'var(--s-5) var(--s-4)',
        font: '400 13px/1.5 var(--font-sans)',
        color: 'var(--fg-3)',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}

function TypeBadge({ type }: { type: SearchHit['type'] }) {
  const label = type === 'channel' ? 'Chat' : 'Proyek'
  return (
    <span
      style={{
        font: '600 9px/1 var(--font-sans)',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        color: 'var(--fg-3)',
        border: '1px solid var(--border)',
        padding: '3px 5px',
        borderRadius: 3,
        background: 'var(--bg)',
      }}
    >
      {label}
    </span>
  )
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <kbd
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          padding: '2px 5px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 3,
        }}
      >
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  )
}
