import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listEmployees, createEmployee } from '../../../../lib/hr'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const departmentId = url.searchParams.get('departmentId') ?? undefined
  const search = url.searchParams.get('search') ?? undefined

  const list = await listEmployees(ctx.tenant.id, {
    status: status as never,
    departmentId,
    search,
  })
  return NextResponse.json({ employees: list })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const result = await createEmployee(ctx.tenant.id, body as never)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ employee: result.employee }, { status: 201 })
}
