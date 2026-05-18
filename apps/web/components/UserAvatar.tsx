'use client'

import { useRouter } from 'next/navigation'

export default function UserAvatar({
  initials,
  email,
}: {
  initials: string
  email?: string
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      title={email ? `${email} · Pengaturan` : 'Pengaturan akun'}
      onClick={() => router.push('/settings')}
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
  )
}
