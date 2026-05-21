import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { issueMagicLink } from '../../../../lib/portal-auth'

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: true })   // always 200 to avoid enumeration
  }

  const issued = await issueMagicLink(email)
  if (!issued) return NextResponse.json({ ok: true })

  const hdrs = await headers()
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') ?? 'http'
  const link = `${proto}://${host}/portal/verify?token=${issued.token}`

  // TODO: send via email/WhatsApp once IS-EMAIL is shipped. For now, return
  // link directly in dev mode so testing is possible without a mail provider.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({ ok: true, devLink: link })
  }

  // Fire-and-forget delivery — would call IS-TRIG / email provider here
  console.log('[portal] magic link issued for', email, 'tenant:', issued.tenant.name)
  return NextResponse.json({ ok: true })
}
