'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppearanceMenu from './AppearanceMenu'

export default function UserAvatar({
  initials,
  email,
}: {
  initials: string
  email?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        title={email ?? 'Akun'}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--indigo)',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: '600 11px/1 var(--font-sans)',
          flexShrink: 0,
          cursor: 'pointer',
          border: 'none',
          outline: 'none',
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 260,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {email && (
            <div style={{ padding: 'var(--s-3)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ font: '500 12px/1.3 var(--font-sans)', color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
            </div>
          )}

          <AppearanceMenu />

          <div style={{ borderTop: '1px solid var(--border)' }}>
            <MenuItem onClick={() => { setOpen(false); router.push('/settings') }}>Pengaturan</MenuItem>
            <MenuItem onClick={() => { setOpen(false); router.push('/admin/branding') }}>Branding Workspace</MenuItem>
            <MenuItem
              onClick={async () => {
                setOpen(false)
                await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {})
                router.push('/sign-in')
              }}
              danger
            >
              Keluar
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: 'none',
        background: 'transparent',
        font: '500 13px/1 var(--font-sans)',
        color: danger ? 'var(--danger)' : 'var(--fg-1)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}
