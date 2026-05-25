import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listContacts } from '../../../../lib/contacts'
import { CrmShell } from '../../CrmShell'
import { NewDealForm } from './NewDealForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewDealPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const contacts = await listContacts(ctx.tenant.id, { role: 'customer' })

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="pipeline"
    >
      <NewDealForm contacts={contacts.map((c) => ({ id: c.contact.id, name: c.contact.name }))} />
    </CrmShell>
  )
}
