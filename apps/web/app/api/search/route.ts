import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../lib/requireSession'
import { searchTenant } from '../../../lib/search'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const hits = await searchTenant(result.ctx.tenant.id, q)
  return NextResponse.json({ hits })
}
