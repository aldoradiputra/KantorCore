import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listThreads } from '../../../../lib/email'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const url = new URL(req.url)
  const accountId = url.searchParams.get('accountId')
  const statusParam = url.searchParams.get('status')
  if (!accountId) return NextResponse.json({ error: 'accountId diperlukan.' }, { status: 400 })

  const status = statusParam === 'snoozed' || statusParam === 'closed' || statusParam === 'open'
    ? statusParam
    : undefined

  const threads = await listThreads(ctx.tenant.id, accountId, { status })
  return NextResponse.json(threads)
}
