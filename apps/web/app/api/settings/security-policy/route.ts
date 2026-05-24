import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getSecurityPolicy, saveSecurityPolicy } from '../../../../lib/admin'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const policy = await getSecurityPolicy(ctx.tenant.id)
  return NextResponse.json({ policy })
}

export async function PUT(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const pwdMin = Number(body.passwordMinLength ?? 8)
  const sessionHours = Number(body.sessionTimeoutHours ?? 720)
  if (pwdMin < 6 || pwdMin > 128) return NextResponse.json({ error: 'Panjang kata sandi harus 6–128.' }, { status: 400 })
  if (sessionHours < 1 || sessionHours > 8760) return NextResponse.json({ error: 'Session timeout harus 1–8760 jam.' }, { status: 400 })

  const copyInfoMinRole = body.copyInfoMinRole ?? 'member'
  if (copyInfoMinRole !== 'owner' && copyInfoMinRole !== 'admin' && copyInfoMinRole !== 'member') {
    return NextResponse.json({ error: 'copyInfoMinRole tidak valid.' }, { status: 400 })
  }

  const policy = await saveSecurityPolicy({
    tenantId: ctx.tenant.id,
    updatedBy: ctx.session.user.id,
    require2fa: !!body.require2fa,
    passwordMinLength: pwdMin,
    sessionTimeoutHours: sessionHours,
    ipAllowlist: Array.isArray(body.ipAllowlist) ? body.ipAllowlist.filter((s: unknown) => typeof s === 'string') : [],
    copyInfoMinRole,
  })
  return NextResponse.json({ policy })
}
