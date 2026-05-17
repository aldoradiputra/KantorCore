'use client'

import { useState } from 'react'

export default function SignOutButton() {
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    await fetch('/api/auth/sign-out', { method: 'POST' })
    window.location.href = '/sign-in'
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      style={{
        height: 28,
        padding: '0 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        background: 'var(--surface)',
        color: 'var(--fg-2)',
        font: '500 12px/1 var(--font-sans)',
        cursor: pending ? 'wait' : 'pointer',
      }}
    >
      {pending ? '…' : 'Keluar'}
    </button>
  )
}
