import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

export type SettingsSection =
  | 'profile'
  | 'security'
  | 'workspace'
  | 'members'
  | 'contacts'
  | 'groups'
  | 'directory'
  | 'security-policy'
  | 'audit'
  | 'api-keys'
  | 'billing'
  | 'chat'
  | 'proj'
  | 'agent'
  | 'technical'
  | 'platform-models'

interface NavItem {
  section: SettingsSection
  label: string
  href: string
  adminOnly?: boolean
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Personal',
    items: [
      { section: 'profile',   label: 'Profil',    href: '/settings/profile' },
      { section: 'security',  label: 'Keamanan',  href: '/settings/security' },
    ],
  },
  {
    group: 'Ruang Kerja',
    items: [
      { section: 'workspace',  label: 'Pengaturan Umum',    href: '/settings/workspace',  adminOnly: true },
      { section: 'members',    label: 'Anggota & Undangan', href: '/settings/members',    adminOnly: true },
      { section: 'contacts',   label: 'Kontak',             href: '/settings/contacts',   adminOnly: true },
      { section: 'groups',     label: 'Grup',               href: '/settings/groups',     adminOnly: true },
      { section: 'directory',  label: 'Direktori',          href: '/settings/directory',  adminOnly: true },
      { section: 'billing',    label: 'Langganan',          href: '/settings/billing',    adminOnly: true },
    ],
  },
  {
    group: 'Keamanan & Kepatuhan',
    items: [
      { section: 'security-policy', label: 'Kebijakan Keamanan', href: '/settings/security-policy', adminOnly: true },
      { section: 'audit',            label: 'Log Audit',          href: '/settings/audit',           adminOnly: true },
      { section: 'api-keys',         label: 'API Keys',           href: '/settings/api-keys',        adminOnly: true },
    ],
  },
  {
    group: 'Modul',
    items: [
      { section: 'chat',   label: 'Chat',    href: '/settings/chat' },
      { section: 'proj',   label: 'Proyek',  href: '/settings/proj' },
      { section: 'agent',  label: 'Agent',   href: '/settings/agent' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { section: 'platform-models', label: 'Model & Custom Fields', href: '/settings/platform/models', adminOnly: true },
    ],
  },
  {
    group: 'Teknis',
    items: [
      { section: 'technical', label: 'Informasi Teknis', href: '/settings/technical', adminOnly: true },
    ],
  },
]

function SettingsSidebar({
  activeSection,
  isAdmin,
}: {
  activeSection: SettingsSection
  isAdmin: boolean
}) {
  return (
    <div style={{
      padding: 'var(--s-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-4)',
      height: '100%',
      overflowY: 'auto',
    }}>
      {NAV.map(({ group, items }) => {
        const visible = items.filter((i) => !i.adminOnly || isAdmin)
        if (visible.length === 0) return null
        return (
          <div key={group}>
            <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>{group}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {visible.map((item) => {
                const active = item.section === activeSection
                return (
                  <Link
                    key={item.section}
                    href={item.href}
                    style={{
                      height: 32,
                      padding: '0 8px',
                      borderRadius: 'var(--r-sm)',
                      font: '500 13px/32px var(--font-sans)',
                      color: active ? 'var(--indigo)' : 'var(--fg-2)',
                      background: active ? 'var(--indigo-light)' : 'transparent',
                      textDecoration: 'none',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SettingsShell({
  activeSection,
  isAdmin,
  tenantName,
  userInitials,
  userEmail,
  children,
}: {
  activeSection: SettingsSection
  isAdmin: boolean
  tenantName: string
  userInitials: string
  userEmail?: string
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      userEmail={userEmail}
      activeModule={null}
      sidebar={<SettingsSidebar activeSection={activeSection} isAdmin={isAdmin} />}
    >
      {children}
    </AppShell>
  )
}
