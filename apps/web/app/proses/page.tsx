import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listProcesses, seedDefaultProcesses, MODULE_LABEL, PROCESS_MODE_LABEL, PROCESS_MODE_COLOR, PROCESS_MODE_DESCRIPTION } from '../../lib/processes'
import { AppShell } from '../../components/AppShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ProsesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  // Auto-seed older tenants on first visit (idempotent, ~10ms when no-op).
  let processes = await listProcesses(ctx.tenant.id)
  if (processes.length === 0) {
    await seedDefaultProcesses(ctx.tenant.id)
    processes = await listProcesses(ctx.tenant.id)
  }

  const byModule = new Map<string, typeof processes>()
  for (const p of processes) {
    const list = byModule.get(p.module) ?? []
    list.push(p)
    byModule.set(p.module, list)
  }

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeModule="proses"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        <header>
          <h1 style={{ font: '600 24px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Pustaka Proses
          </h1>
          <p style={{ font: '14px/1.55 var(--font-sans)', color: 'var(--fg-3)', marginTop: 8, maxWidth: 640 }}>
            Cara KantorCore menjalankan alur lintas-modul. Setiap langkah ditandai apakah berjalan
            secara <b style={{ color: 'var(--teal)' }}>Otomatis</b> (aturan pasti, dapat diaudit)
            atau lewat <b style={{ color: 'var(--indigo)' }}>AI</b> (agent memutuskan dalam batas yang
            Anda tetapkan).
          </p>
        </header>

        {/* Mode legend */}
        <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          {(['deterministic', 'probabilistic', 'hybrid'] as const).map((m) => (
            <div
              key={m}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)',
                flex: '1 1 240px',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: PROCESS_MODE_COLOR[m],
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {PROCESS_MODE_LABEL[m]}
                </div>
                <div style={{ font: '12px/1.45 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                  {PROCESS_MODE_DESCRIPTION[m]}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Process groups */}
        {[...byModule.entries()].map(([mod, list]) => (
          <section key={mod} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <h2
              style={{
                font: '600 11px/1 var(--font-sans)',
                color: 'var(--fg-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              {MODULE_LABEL[mod] ?? mod}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((p) => (
                <Link
                  key={p.id}
                  href={`/proses/${p.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--s-4)',
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--surface)',
                    textDecoration: 'none',
                    transition: 'border-color var(--d-fast) var(--ease), transform var(--d-fast) var(--ease)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                        {p.name}
                      </span>
                      <span
                        style={{
                          font: '600 10px/1 var(--font-sans)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          padding: '3px 7px',
                          borderRadius: 999,
                          background: 'var(--bg)',
                          color: PROCESS_MODE_COLOR[p.mode],
                          border: `1px solid ${PROCESS_MODE_COLOR[p.mode]}`,
                        }}
                      >
                        {PROCESS_MODE_LABEL[p.mode]}
                      </span>
                    </div>
                    <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
                      {p.description}
                    </p>
                  </div>
                  <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', flexShrink: 0 }}>
                    {p.stepCount} langkah →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  )
}
