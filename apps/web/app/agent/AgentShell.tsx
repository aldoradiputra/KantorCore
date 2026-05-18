import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Agent } from '@kantr/db'
import { AppShell } from '../../components/AppShell'

const RUN_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan',
  done: 'Selesai',
  failed: 'Gagal',
  awaiting_approval: 'Perlu persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

function AgentSidebar({
  agents,
  activeId,
}: {
  agents: Agent[]
  activeId: string | null
}) {
  return (
    <div
      style={{
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-micro">Agen</span>
        <Link
          href="/agent/new"
          style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
        >
          + Baru
        </Link>
      </div>
      {agents.length === 0 ? (
        <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
          Belum ada agen. Buat yang pertama.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {agents.map((a) => {
            const active = a.id === activeId
            return (
              <Link
                key={a.id}
                href={`/agent/${a.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 'var(--r-sm)',
                  font: '500 13px/1 var(--font-sans)',
                  color: active ? 'var(--indigo)' : 'var(--fg-2)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: a.enabled ? 'var(--teal)' : 'var(--border-strong)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AgentShell({
  agents,
  activeId,
  tenantName,
  userInitials,
  children,
}: {
  agents: Agent[]
  activeId: string | null
  tenantName: string
  userInitials: string
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="agent"
      sidebar={<AgentSidebar agents={agents} activeId={activeId} />}
    >
      {children}
    </AppShell>
  )
}

export { RUN_STATUS_LABEL }
