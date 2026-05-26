import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listPolicies, listCustomRoles } from '../../../../lib/platform/policy'
import { PoliciesPanel } from './PoliciesPanel'

export default async function PoliciesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [policies, roles] = await Promise.all([
    listPolicies(ctx.tenant.id),
    listCustomRoles(ctx.tenant.id),
  ])

  return (
    <div style={{ padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 880, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/settings" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Settings</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          Platform · Policies
        </div>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Policy Engine
        </h1>
        <p style={{ font: '13px/1.55 var(--font-sans)', color: 'var(--fg-3)', margin: 0, maxWidth: 720 }}>
          Aturan deklaratif yang menentukan siapa boleh melakukan apa pada resource mana.
          Owner selalu lulus. Tanpa policy yang cocok: admin default-allow, member default-deny.
          Deny menang dari allow pada priority yang sama.
        </p>
        <PoliciesPanel initial={policies} roles={roles} />
      </div>
    </div>
  )
}
