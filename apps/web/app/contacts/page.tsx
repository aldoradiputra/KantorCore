import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listContacts, getContactStats } from '../../lib/contacts'
import { listTenantMembers } from '../../lib/proj'
import ContactsApp from './ContactsApp'

export const metadata = { title: 'Kontak' }

export default async function ContactsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [contacts, stats, members] = await Promise.all([
    listContacts(ctx.tenant.id),
    getContactStats(ctx.tenant.id),
    listTenantMembers(ctx.tenant.id),
  ])

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <ContactsApp
      contacts={contacts}
      stats={stats}
      members={members}
      canEdit={isAdmin}
    />
  )
}
