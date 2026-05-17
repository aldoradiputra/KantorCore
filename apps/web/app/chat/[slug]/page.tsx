import { notFound, redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listChannels, getChannelBySlug, listMessages } from '../../../lib/chat'
import { ChatShell } from '../ChatShell'
import ChannelView from './ChannelView'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [channels, channel] = await Promise.all([
    listChannels(ctx.tenant.id),
    getChannelBySlug(ctx.tenant.id, slug),
  ])
  if (!channel) notFound()

  const initial = await listMessages({ tenantId: ctx.tenant.id, channelId: channel.id })

  return (
    <ChatShell
      channels={channels}
      activeSlug={channel.slug}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <ChannelView channel={channel} currentUserId={session.user.id} initialMessages={initial} />
    </ChatShell>
  )
}
