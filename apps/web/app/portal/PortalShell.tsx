import Link from 'next/link'
import type { ReactNode } from 'react'

export function PortalShell({
  children,
  tenantName,
  tenantLogoUrl,
  contactName,
  brandColor,
  activeTab,
}: {
  children: ReactNode
  tenantName: string
  tenantLogoUrl: string | null
  contactName: string
  brandColor: string | null
  activeTab: 'dashboard' | 'orders' | 'invoices' | 'gift-cards' | null
}) {
  const accent = brandColor || '#3B4FC4'
  const tabs = [
    { key: 'dashboard',  label: 'Beranda',    href: '/portal/dashboard' },
    { key: 'orders',     label: 'Pesanan',    href: '/portal/orders' },
    { key: 'invoices',   label: 'Faktur',     href: '/portal/invoices' },
    { key: 'gift-cards', label: 'Gift Card',  href: '/portal/gift-cards' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header style={{
        height: 56,
        borderBottom: `3px solid ${accent}`,
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--s-5)',
        gap: 'var(--s-4)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {tenantLogoUrl ? (
          <img src={tenantLogoUrl} alt={tenantName} style={{ height: 24, width: 'auto', maxWidth: 180, objectFit: 'contain' }} />
        ) : (
          <span style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{tenantName}</span>
        )}

        <nav style={{ display: 'flex', gap: 'var(--s-1)', marginLeft: 'var(--s-4)' }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Link
                key={tab.key}
                href={tab.href}
                style={{
                  padding: '0 var(--s-3)',
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  font: `${active ? '600' : '500'} 13px/1 var(--font-sans)`,
                  color: active ? accent : 'var(--fg-2)',
                  textDecoration: 'none',
                  borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
                  marginBottom: -3,
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{contactName}</span>
          <form action="/api/portal/sign-out" method="POST">
            <button
              type="submit"
              style={{
                height: 32, padding: '0 var(--s-3)', background: 'transparent',
                color: 'var(--fg-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
              }}
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
