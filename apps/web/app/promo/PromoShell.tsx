'use client'

import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { label: 'Promosi', href: '/promo/promotions' },
  { label: 'Voucher',  href: '/promo/vouchers' },
  { label: 'Gift Card', href: '/promo/gift-cards' },
] as const

export default function PromoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Subheader */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 var(--s-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s-1)',
        flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => router.push(tab.href)}
              style={{
                padding: 'var(--s-3) var(--s-3)',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--indigo)' : '2px solid transparent',
                font: `${active ? '600' : '500'} 13px/1 var(--font-sans)`,
                color: active ? 'var(--indigo)' : 'var(--fg-2)',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
