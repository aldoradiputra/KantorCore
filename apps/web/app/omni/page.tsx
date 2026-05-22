import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listChannels } from '../../lib/omni'
import { widgetToken } from '../../lib/omni'
import OmniClient from './OmniClient'

export default async function OmniPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const channels = await listChannels(ctx.tenant.id)
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  const channelsWithToken = channels.map((c) => ({
    ...c,
    widgetToken: c.type === 'web_chat' ? widgetToken(c.id) : null,
  }))

  return (
    <OmniClient
      initialChannels={channelsWithToken}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      currentUserName={session.user.name}
    />
  )
}
