import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listAccounts, createAccount } from '../../../../lib/email'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const accounts = await listAccounts(ctx.tenant.id)
  return NextResponse.json(accounts)
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const required = ['label', 'address', 'imapHost', 'imapUser', 'imapPassword', 'smtpHost', 'smtpUser', 'smtpPassword']
  for (const k of required) {
    if (!body[k]?.toString().trim()) {
      return NextResponse.json({ error: `Kolom "${k}" diperlukan.` }, { status: 400 })
    }
  }

  const acct = await createAccount(ctx.tenant.id, {
    label: body.label.trim(),
    address: body.address.trim(),
    imapHost: body.imapHost.trim(),
    imapPort: body.imapPort,
    imapSecure: body.imapSecure,
    imapUser: body.imapUser.trim(),
    imapPassword: body.imapPassword,
    smtpHost: body.smtpHost.trim(),
    smtpPort: body.smtpPort,
    smtpSecure: body.smtpSecure,
    smtpUser: body.smtpUser.trim(),
    smtpPassword: body.smtpPassword,
  })
  return NextResponse.json(acct, { status: 201 })
}
