import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listContacts, getContactStats } from '../../../lib/contacts'
import { listTenantMembers } from '../../../lib/proj'
import { getSecurityPolicy, canCopyRecordInfo } from '../../../lib/admin'
import ContactsPanel from './ContactsPanel'

export default async function ContactsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const [contacts, stats, members, securityPolicy] = await Promise.all([
    listContacts(ctx.tenant.id),
    getContactStats(ctx.tenant.id),
    listTenantMembers(ctx.tenant.id),
    getSecurityPolicy(ctx.tenant.id),
  ])
  const canCopy = canCopyRecordInfo(ctx.membership.role, securityPolicy)

  return (
    <ContactsPanel
      contacts={contacts}
      stats={stats}
      members={members}
      canCopy={canCopy}
    />
  )
}
