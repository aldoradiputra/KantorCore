import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listChannels } from '../../lib/chat'

/**
 * /chat redirects to the first available channel, or to a "create a channel"
 * empty state if none exist yet. Keeps URLs deterministic so a refresh always
 * lands somewhere meaningful.
 */
export default async function ChatIndexPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const channels = await listChannels(ctx.tenant.id)
  if (channels.length > 0) {
    redirect(`/chat/${channels[0].slug}`)
  }
  redirect('/chat/new')
}
