import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { AppShell } from '../../../../components/AppShell'
import { RecordDetail } from '../../../../components/platform/RecordDetail'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ model: string; id: string }>
}) {
  const { model, id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  return (
    <AppShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeModule={null}>
      <div style={{ padding: 'var(--s-6) var(--content-gutter)' }}>
        <RecordDetail modelKey={decodeURIComponent(model)} id={id} tenantId={ctx.tenant.id} />
      </div>
    </AppShell>
  )
}
