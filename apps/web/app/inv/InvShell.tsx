import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type InvSection = 'products' | 'categories' | 'uom'

function InvSidebar({ activeSection }: { activeSection: InvSection | null }) {
  const nav: { section: InvSection; label: string; href: string }[] = [
    { section: 'products',   label: 'Produk & Layanan', href: '/inv/products' },
    { section: 'categories', label: 'Kategori',         href: '/inv/categories' },
    { section: 'uom',        label: 'Satuan (UOM)',     href: '/inv/uom' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      <span className="t-micro">INVENTORI</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ section, label, href }) => {
          const active = section === activeSection
          return (
            <Link
              key={section}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 32,
                padding: '0 8px',
                borderRadius: 'var(--r-sm)',
                font: '500 13px/1 var(--font-sans)',
                color: active ? 'var(--indigo)' : 'var(--fg-2)',
                background: active ? 'var(--indigo-light)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function InvShell({
  tenantName,
  userInitials,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  activeSection: InvSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="inv"
      sidebar={<InvSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
