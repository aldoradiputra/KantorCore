import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getUserAppearance, updateUserAppearance } from '../../../../lib/preferences'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const appearance = await getUserAppearance(ctx.session.user.id)
  return NextResponse.json(appearance)
}

export async function PATCH(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const body = await req.json()
  const res = await updateUserAppearance(ctx.session.user.id, {
    themeMode:   body.themeMode,
    accentColor: body.accentColor,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })

  const response = NextResponse.json(res.appearance)
  // Mirror to cookies so the inline init script can apply the theme
  // before SSR finishes — avoids flash on hard reload.
  response.cookies.set('theme', res.appearance.themeMode,   { path: '/', maxAge: 60 * 60 * 24 * 365 })
  response.cookies.set('accent', res.appearance.accentColor, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}
