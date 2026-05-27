'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface MenuItem {
  label: string
  href?: string
  onClick?: () => void | Promise<void>
  destructive?: boolean
}

export default function UserAvatar({
  initials,
  email,
}: {
  initials: string
  email?: string
}) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Outside click + Escape close
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (menuRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })
    } finally {
      window.location.href = '/sign-in'
    }
  }

  const items: MenuItem[] = [
    { label: 'Profil',      href: '/settings/profile' },
    { label: 'Pengaturan',  href: '/settings' },
    { label: 'Keamanan',    href: '/settings/security' },
    { label: signingOut ? 'Keluar…' : 'Keluar', onClick: signOut, destructive: true },
  ]

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
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
          ref={menuRef}
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 220,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            zIndex: 200,
            padding: '4px 0',
          }}
        >
          {email && (
            <>
              <div
                style={{
                  padding: '10px 12px 8px',
                  font: '500 11px/1.3 var(--font-sans)',
                  color: 'var(--fg-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 4,
                }}
                title={email}
              >
                {email}
              </div>
            </>
          )}
          {items.map((item, i) => {
            const isDivider = item.destructive && i > 0 && !items[i - 1].destructive
            const baseStyle: React.CSSProperties = {
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              font: '500 13px/1 var(--font-sans)',
              color: item.destructive ? 'var(--amber)' : 'var(--fg-1)',
              textAlign: 'left',
              cursor: 'pointer',
              textDecoration: 'none',
              borderRadius: 0,
            }
            const onHover = (el: HTMLElement, on: boolean) => {
              el.style.background = on ? 'var(--bg)' : 'transparent'
            }
            const content = item.label

            return (
              <div key={item.label}>
                {isDivider && (
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    onMouseEnter={(e) => onHover(e.currentTarget, true)}
                    onMouseLeave={(e) => onHover(e.currentTarget, false)}
                    style={baseStyle}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={signingOut && item.destructive}
                    onClick={async () => {
                      await item.onClick?.()
                    }}
                    onMouseEnter={(e) => onHover(e.currentTarget, true)}
                    onMouseLeave={(e) => onHover(e.currentTarget, false)}
                    style={{ ...baseStyle, cursor: signingOut && item.destructive ? 'wait' : 'pointer' }}
                  >
                    {content}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
