import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { SettingsSidebar, type SettingsNavItem } from './SettingsSidebar'

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
  | 'platform-policies'
  | 'platform-roles'
  | 'platform-history'

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
      { section: 'platform-models',   label: 'Model & Custom Fields', href: '/settings/platform/models',   adminOnly: true },
      { section: 'platform-roles',    label: 'Custom Roles',          href: '/settings/platform/roles',    adminOnly: true },
      { section: 'platform-policies', label: 'Policies',              href: '/settings/platform/policies', adminOnly: true },
      { section: 'platform-history',  label: 'Riwayat Konfigurasi',   href: '/settings/platform/history',  adminOnly: true },
    ],
  },
  {
    group: 'Teknis',
    items: [
      { section: 'technical', label: 'Informasi Teknis', href: '/settings/technical', adminOnly: true },
    ],
  },
]

function flattenNav(isAdmin: boolean): SettingsNavItem[] {
  const out: SettingsNavItem[] = []
  for (const { group, items } of NAV) {
    for (const it of items) {
      if (it.adminOnly && !isAdmin) continue
      out.push({ section: it.section, label: it.label, href: it.href, group })
    }
  }
  return out
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
  const items = flattenNav(isAdmin)
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      userEmail={userEmail}
      activeModule={null}
      sidebar={<SettingsSidebar items={items} activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
