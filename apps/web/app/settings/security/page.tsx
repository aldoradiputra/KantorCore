import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SettingsShell } from '../SettingsShell'
import { SecuritySettings } from './SecuritySettings'
import { users } from '@kantorcore/db'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../lib/db'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function SecurityPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  const [user] = await getDb()
    .select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return (
    <SettingsShell
      activeSection="security"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <SecuritySettings totpEnabled={user?.totpEnabled ?? false} currentSessionToken={session.session.token} />
    </SettingsShell>
  )
}
