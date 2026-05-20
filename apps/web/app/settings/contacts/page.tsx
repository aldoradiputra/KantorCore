import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listContacts, getContactStats } from '../../../lib/contacts'
import { listTenantMembers } from '../../../lib/proj'
import { SettingsShell } from '../SettingsShell'
import ContactsPanel from './ContactsPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ContactsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const [contacts, stats, members] = await Promise.all([
    listContacts(ctx.tenant.id),
    getContactStats(ctx.tenant.id),
    listTenantMembers(ctx.tenant.id),
  ])

  return (
    <SettingsShell
      activeSection="contacts"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <ContactsPanel
        contacts={contacts}
        stats={stats}
        members={members}
      />
    </SettingsShell>
  )
}
