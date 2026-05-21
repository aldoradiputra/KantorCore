import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listSlaPolicies } from '../../../lib/helpdesk'
import SlaPoliciesClient from './SlaPoliciesClient'

export default async function SlaPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const policies = await listSlaPolicies(ctx.tenant.id)

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Help Desk · Kebijakan SLA</span>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          Kebijakan SLA
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
          Target waktu respons & penyelesaian berdasarkan kondisi tiket. Dievaluasi berurutan — kebijakan pertama yang cocok digunakan.
        </p>
      </header>
      <SlaPoliciesClient initialPolicies={policies} />
    </div>
  )
}
