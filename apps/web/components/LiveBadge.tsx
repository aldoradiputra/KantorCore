'use client'

import { useEffect, useState } from 'react'

export default function LiveBadge() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div
      title={online ? 'Terhubung' : 'Tidak terhubung'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 8px',
        borderRadius: 'var(--r-sm)',
        background: online ? 'rgba(15, 123, 108, 0.06)' : 'rgba(179, 90, 0, 0.06)',
        border: `1px solid ${online ? 'rgba(15, 123, 108, 0.2)' : 'rgba(179, 90, 0, 0.2)'}`,
        cursor: 'default',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: online ? 'var(--teal)' : 'var(--amber)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          font: '600 10px/1 var(--font-sans)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: online ? 'var(--teal)' : 'var(--amber)',
        }}
      >
        {online ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}
