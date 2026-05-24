import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getInstance } from '../../../../lib/platform/workflow-executor'
import { AppShell } from '../../../../components/AppShell'
import { InstanceDetail } from '../../../../components/platform/ProcessInstancePanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getInstance(ctx.tenant.id, id)
  if (!data) notFound()

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeModule="proses"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/proses" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
            Pustaka Proses
          </Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <Link href="/proses/instances" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
            Instance
          </Link>
          <span style={{ margin: '0 6px' }}>›</span>
          Detail
        </div>

        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
          Instance Proses
        </h1>

        <InstanceDetail data={data} />
      </div>
    </AppShell>
  )
}
