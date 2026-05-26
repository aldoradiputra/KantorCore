import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SecuritySettings } from './SecuritySettings'
import { users } from '@kantorcore/db'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../lib/db'

export default async function SecurityPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [user] = await getDb()
    .select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return (
    <SecuritySettings totpEnabled={user?.totpEnabled ?? false} currentSessionToken={session.session.token} />
  )
}
