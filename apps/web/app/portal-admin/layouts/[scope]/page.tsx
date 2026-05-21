import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getOrCreateLayout, listBlocks } from '../../../../lib/blocks'
import { LayoutEditorClient } from './LayoutEditorClient'

const SCOPE_LABELS: Record<string, string> = {
  portal_dashboard: 'Dashboard Portal',
  portal_help_home: 'Pusat Bantuan',
}

export default async function LayoutEditorPage({ params }: { params: Promise<{ scope: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/')

  const { scope } = await params
  const label = SCOPE_LABELS[scope] ?? scope

  const layout = await getOrCreateLayout(ctx.tenant.id, scope, label)
  const blocks = await listBlocks(ctx.tenant.id, layout.id)

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Portal Admin · Layout</span>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          {label}
        </h1>
        <p style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-3)', marginTop: 4 }}>{scope}</p>
      </header>
      <LayoutEditorClient scope={scope} layoutId={layout.id} initialBlocks={blocks} />
    </div>
  )
}
