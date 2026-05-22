import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listAccounts } from '../../lib/email'
import EmailClient from './EmailClient'

export default async function EmailPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const accounts = await listAccounts(ctx.tenant.id)
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return <EmailClient initialAccounts={accounts} isAdmin={isAdmin} />
}
