import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signOutPortal, PORTAL_COOKIE } from '../../../../lib/portal-auth'

export async function POST() {
  await signOutPortal()
  const cookieStore = await cookies()
  cookieStore.delete(PORTAL_COOKIE)
  return NextResponse.redirect(new URL('/portal/sign-in', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'), { status: 303 })
}
