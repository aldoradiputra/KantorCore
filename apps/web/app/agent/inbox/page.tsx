import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listAgents, listActiveRuns } from '../../../lib/agent'
import { AgentShell, RUN_STATUS_LABEL } from '../AgentShell'

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--fg-3)',
  running: 'var(--indigo)',
  awaiting_approval: 'var(--amber)',
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function AgentInboxPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [agentList, active] = await Promise.all([
    listAgents(ctx.tenant.id),
    listActiveRuns(ctx.tenant.id),
  ])

  return (
    <AgentShell
      agents={agentList}
      activeId={null}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 880, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--s-5)' }}>
            <h2 style={{ margin: 0 }}>Inbox</h2>
            <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
              {active.length} run aktif
            </span>
          </div>

          {active.length === 0 ? (
            <div
              style={{
                padding: 'var(--s-6)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--r-md)',
                textAlign: 'center',
                font: '400 13px/1.5 var(--font-sans)',
                color: 'var(--fg-3)',
              }}
            >
              Tidak ada run aktif. Pending, running, dan run yang menunggu persetujuan akan muncul di sini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {active.map(({ run, agent }) => (
                <Link
                  key={run.id}
                  href={`/agent/${agent.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 140px 160px',
                    gap: 'var(--s-3)',
                    alignItems: 'center',
                    padding: '10px var(--s-3)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                    {agent.name}
                  </span>
                  <span
                    style={{
                      font: '600 11px/1 var(--font-sans)',
                      color: STATUS_COLOR[run.status] ?? 'var(--fg-3)',
                    }}
                  >
                    {RUN_STATUS_LABEL[run.status] ?? run.status}
                  </span>
                  <span
                    style={{
                      font: '500 11px/1 var(--font-mono)',
                      color: 'var(--fg-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {run.id.slice(0, 8)}…
                  </span>
                  <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {new Date(run.createdAt).toLocaleString('id-ID', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AgentShell>
  )
}
