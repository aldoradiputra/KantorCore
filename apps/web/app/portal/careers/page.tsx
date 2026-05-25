import { notFound } from 'next/navigation'
import Link from 'next/link'
import { listOpenJobs } from '../../../lib/recruitment'
import { getCurrentTenant } from '../../../lib/tenants'
import { getDb } from '../../../lib/db'
import { tenants } from '@kantorcore/db'
import { eq } from 'drizzle-orm'

// Public careers portal — rendered server-side for SEO.
// Tenant identified by ?tenant= query param (tenantId or custom slug).

export default async function CareersPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const { tenant: tenantParam } = await searchParams
  if (!tenantParam) return notFound()

  const db = getDb()
  const [tenantRow] = await db.select({ id: tenants.id, name: tenants.name })
    .from(tenants).where(eq(tenants.id, tenantParam)).limit(1)
  if (!tenantRow) return notFound()

  const jobs = await listOpenJobs(tenantRow.id)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }}>
      {/* Hero */}
      <div style={{ background: 'var(--indigo)', color: 'white', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ font: '600 32px/1.2 var(--font-sans)', marginBottom: 12 }}>{tenantRow.name}</div>
        <div style={{ font: '16px/1.6 var(--font-sans)', opacity: 0.85 }}>Bergabunglah dengan tim kami</div>
      </div>

      {/* Job list */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ font: '600 20px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 24 }}>
          Posisi Terbuka ({jobs.length})
        </h2>
        {jobs.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--fg-3)', font: '14px/1.6 var(--font-sans)' }}>
            Belum ada posisi terbuka saat ini. Pantau terus halaman ini untuk update.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/portal/careers/${job.id}?tenant=${tenantRow.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                padding: '20px 24px', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                background: 'var(--surface)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 16,
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}>
                <div>
                  <div style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 6 }}>
                    {job.title}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {job.departmentName && (
                      <span style={{ padding: '2px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                        {job.departmentName}
                      </span>
                    )}
                    <span style={{ textTransform: 'capitalize' }}>
                      {job.employmentType.replace('_', ' ')}
                    </span>
                    {job.isRemoteFriendly && (
                      <span style={{ color: 'var(--teal)' }}>Remote Friendly</span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, font: '600 13px/1 var(--font-sans)', color: 'var(--indigo)' }}>
                  Lamar →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
