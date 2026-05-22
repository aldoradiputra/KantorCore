import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listConversations } from '../../../../lib/omni'
import type { OmniConvStatus } from '../../../../lib/omni'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId') ?? undefined
  const statusParam = url.searchParams.get('status')
  const status: OmniConvStatus | undefined =
    statusParam === 'open' || statusParam === 'pending' || statusParam === 'resolved' || statusParam === 'snoozed'
      ? statusParam
      : undefined

  const convs = await listConversations(ctx.tenant.id, { channelId, status })
  return NextResponse.json(convs)
}
