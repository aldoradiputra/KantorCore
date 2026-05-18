'use client'

import { useEffect, useRef, useState } from 'react'

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1a5 5 0 0 1 5 5v3l1.5 1.5H1.5L3 9V6a5 5 0 0 1 5-5z" />
      <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        title="Notifikasi"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: open ? 'var(--indigo-light)' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          color: open ? 'var(--indigo)' : 'var(--fg-3)',
          cursor: 'pointer',
        }}
      >
        <IconBell />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 280,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 'var(--s-4)',
            zIndex: 100,
          }}
        >
          <div className="t-micro" style={{ marginBottom: 'var(--s-3)' }}>
            Notifikasi
          </div>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
            Belum ada notifikasi. Mentions, balasan, dan update issue akan muncul di sini.
          </p>
        </div>
      )}
    </div>
  )
}
