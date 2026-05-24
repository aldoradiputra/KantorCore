import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { AppShell } from '../../../components/AppShell'
import { RecordList } from '../../../components/platform/RecordList'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function RecordsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ model: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { model } = await params
  const { view } = await searchParams
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const modelKey = decodeURIComponent(model)

  return (
    <AppShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeModule={null}>
      <div style={{ padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 960, width: '100%' }}>
          <RecordList modelKey={modelKey} tenantId={ctx.tenant.id} viewId={view} />
        </div>
      </div>
    </AppShell>
  )
}
