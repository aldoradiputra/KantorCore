import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listAgents } from '../../lib/agent'
import { AgentShell } from './AgentShell'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function AgentPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const agentList = await listAgents(ctx.tenant.id)

  return (
    <AgentShell
      agents={agentList}
      activeId={null}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--s-7) var(--content-gutter)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: agentList.length === 0 ? 'center' : 'flex-start',
        }}
      >
        {agentList.length === 0 ? (
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              padding: 'var(--s-7)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface)',
            }}
          >
            <span className="t-micro" style={{ display: 'block', marginBottom: 'var(--s-4)' }}>
              IS-AGENT · Phase 1
            </span>
            <h2 style={{ marginBottom: 'var(--s-3)' }}>Agent Runtime</h2>
            <p style={{ color: 'var(--fg-3)', marginBottom: 'var(--s-5)' }}>
              Agen adalah aktor otonom yang bisa memanggil tool yang Anda izinkan via sistem Mandat.
              Buat agen pertama untuk memulai.
            </p>
            <Link
              href="/agent/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 36,
                padding: '0 var(--s-4)',
                background: 'var(--indigo)',
                color: 'var(--white)',
                borderRadius: 'var(--r-sm)',
                font: '600 13px/1 var(--font-sans)',
                textDecoration: 'none',
              }}
            >
              Buat agen pertama
            </Link>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 720 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--s-4)',
              }}
            >
              <h2 style={{ margin: 0 }}>Agen</h2>
              <Link
                href="/agent/new"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 32,
                  padding: '0 var(--s-3)',
                  background: 'var(--indigo)',
                  color: 'var(--white)',
                  borderRadius: 'var(--r-sm)',
                  font: '600 12px/1 var(--font-sans)',
                  textDecoration: 'none',
                }}
              >
                + Baru
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              {agentList.map((a) => (
                <Link
                  key={a.id}
                  href={`/agent/${a.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--s-3)',
                    padding: 'var(--s-3) var(--s-4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--surface)',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: a.enabled ? 'var(--teal)' : 'var(--border-strong)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                      {a.name}
                    </div>
                    {a.description && (
                      <div
                        style={{
                          font: '400 12px/1.4 var(--font-sans)',
                          color: 'var(--fg-3)',
                          marginTop: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {a.description}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      font: '500 11px/1 var(--font-mono)',
                      color: 'var(--fg-3)',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      padding: '3px 6px',
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    {a.model}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AgentShell>
  )
}
