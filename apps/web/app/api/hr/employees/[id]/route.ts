import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { getEmployee, updateEmployee, deleteEmployee } from '../../../../../lib/hr'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const employee = await getEmployee(ctx.tenant.id, id)
  if (!employee) return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ employee })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const result = await updateEmployee(ctx.tenant.id, id, body as never)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ employee: result.employee })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const result = await deleteEmployee(ctx.tenant.id, id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ ok: true })
}
