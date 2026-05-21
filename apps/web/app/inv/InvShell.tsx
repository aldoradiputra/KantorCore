import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type InvSection = 'products' | 'categories' | 'uom' | 'stock' | 'moves' | 'adjust'

function InvSidebar({ activeSection }: { activeSection: InvSection | null }) {
  const groups: { label: string; items: { section: InvSection; label: string; href: string }[] }[] = [
    {
      label: 'Katalog',
      items: [
        { section: 'products',   label: 'Produk & Layanan', href: '/inv/products' },
        { section: 'categories', label: 'Kategori',         href: '/inv/categories' },
        { section: 'uom',        label: 'Satuan (UOM)',     href: '/inv/uom' },
      ],
    },
    {
      label: 'Stok',
      items: [
        { section: 'stock',  label: 'Stok Tersedia',      href: '/inv/stock' },
        { section: 'moves',  label: 'Riwayat Pergerakan', href: '/inv/moves' },
        { section: 'adjust', label: 'Penyesuaian Stok',   href: '/inv/adjust' },
      ],
    },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%', overflowY: 'auto' }}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>{label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map(({ section, label: itemLabel, href }) => {
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
                  {itemLabel}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
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
