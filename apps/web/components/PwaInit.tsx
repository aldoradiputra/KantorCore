'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInit() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!installPrompt || dismissed) return null

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setInstallPrompt(null)
      setDismissed(true)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        font: '13px/1 var(--font-sans)',
        color: 'var(--fg-1)',
        whiteSpace: 'nowrap',
      }}
    >
      <img src="/brand/kantorcore-mark.svg" alt="" width={20} height={20} />
      <span>Pasang KantorCore di perangkat ini</span>
      <button
        onClick={install}
        style={{
          height: 28,
          padding: '0 12px',
          background: 'var(--indigo)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: 'var(--r-sm)',
          font: '600 12px/1 var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        Pasang
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--fg-3)',
          cursor: 'pointer',
          fontSize: 16,
          borderRadius: 4,
        }}
        aria-label="Tutup"
      >
        ×
      </button>
    </div>
  )
}
