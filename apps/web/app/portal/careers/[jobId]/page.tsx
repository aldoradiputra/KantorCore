import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../../../../lib/db'
import { jobPositions, departments, tenants } from '@kantorcore/db'
import { ApplyForm } from './ApplyForm'

export default async function CareerJobPage({
  params, searchParams,
}: {
  params: Promise<{ jobId: string }>
  searchParams: Promise<{ tenant?: string }>
}) {
  const { jobId } = await params
  const { tenant: tenantId } = await searchParams
  if (!tenantId) return notFound()

  const db = getDb()

  const [row] = await db
    .select({ job: jobPositions, deptName: departments.name, tenantName: tenants.name })
    .from(jobPositions)
    .leftJoin(departments, eq(jobPositions.departmentId, departments.id))
    .leftJoin(tenants, eq(jobPositions.tenantId, tenants.id))
    .where(and(eq(jobPositions.id, jobId), eq(jobPositions.tenantId, tenantId), eq(jobPositions.status, 'open')))
    .limit(1)

  if (!row) return notFound()
  const { job, deptName, tenantName } = row

  const fmtIDR = (n: string | null) => n ? 'Rp ' + new Intl.NumberFormat('id-ID').format(Number(n)) : null
  const salaryRange = fmtIDR(job.salaryMin as any)
    ? `${fmtIDR(job.salaryMin as any)} – ${fmtIDR(job.salaryMax as any)}`
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }}>
      {/* Nav */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/portal/careers?tenant=${tenantId}`} style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
          ← {tenantName}
        </Link>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Job header */}
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {deptName && (
              <span style={{ padding: '3px 10px', background: 'var(--indigo-light, #eef0ff)', color: 'var(--indigo)', font: '500 12px/1 var(--font-sans)', borderRadius: 999 }}>
                {deptName}
              </span>
            )}
            <span style={{ padding: '3px 10px', background: 'var(--bg)', color: 'var(--fg-3)', font: '500 12px/1 var(--font-sans)', border: '1px solid var(--border)', borderRadius: 999, textTransform: 'capitalize' }}>
              {job.employmentType.replace('_', ' ')}
            </span>
            {job.isRemoteFriendly && (
              <span style={{ padding: '3px 10px', background: '#D1FAE5', color: '#065F46', font: '500 12px/1 var(--font-sans)', borderRadius: 999 }}>
                Remote Friendly
              </span>
            )}
          </div>
          <h1 style={{ font: '700 28px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 8px' }}>{job.title}</h1>
          {salaryRange && (
            <div style={{ font: '16px/1 var(--font-sans)', color: 'var(--teal)' }}>{salaryRange} / bulan</div>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
            <h2 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 12px' }}>Deskripsi Pekerjaan</h2>
            <p style={{ font: '14px/1.8 var(--font-sans)', color: 'var(--fg-2)', margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
            <h2 style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 12px' }}>Persyaratan</h2>
            <p style={{ font: '14px/1.8 var(--font-sans)', color: 'var(--fg-2)', margin: 0, whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
          </div>
        )}

        {/* Application form */}
        <div style={{ padding: '24px', border: '2px solid var(--indigo)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
          <h2 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 20px' }}>Lamar Posisi Ini</h2>
          <ApplyForm jobPositionId={job.id} tenantId={tenantId} />
        </div>
      </div>
    </div>
  )
}
