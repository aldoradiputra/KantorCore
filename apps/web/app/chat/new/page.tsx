import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listChannels } from '../../../lib/chat'
import { ChatShell } from '../ChatShell'
import NewChannelForm from './NewChannelForm'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function NewChannelPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const channels = await listChannels(ctx.tenant.id)
  return (
    <ChatShell
      channels={channels}
      activeSlug={null}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <NewChannelForm />
    </ChatShell>
  )
}
