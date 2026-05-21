import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getTenantBranding, updateTenantBranding } from '../../../../lib/branding'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const branding = await getTenantBranding(ctx.tenant.id)
  return NextResponse.json(branding)
}

export async function PATCH(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) {
    return NextResponse.json({ error: 'Hanya admin workspace yang bisa mengubah branding.' }, { status: 403 })
  }

  const body = await req.json()
  const res = await updateTenantBranding(ctx.tenant.id, {
    logoUrl:    body.logoUrl,
    brandColor: body.brandColor,
    loginBgUrl: body.loginBgUrl,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
  return NextResponse.json(res.branding)
}
