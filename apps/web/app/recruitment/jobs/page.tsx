import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listJobPositions } from '../../../lib/recruitment'
import { RecruitmentShell } from '../RecruitmentShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', open: 'Buka', closed: 'Tutup', cancelled: 'Batal',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--fg-3)', open: 'var(--teal)', closed: 'var(--fg-3)', cancelled: 'var(--danger)',
}
const fmtIDR = (n: number | null) => n ? 'Rp ' + new Intl.NumberFormat('id-ID').format(n) : null

export default async function JobsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const jobs = await listJobPositions(ctx.tenant.id)

  return (
    <RecruitmentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="jobs">
      <div style={{ padding: 'var(--s-6)', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-5)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Posisi Kerja</h1>
            <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
              {jobs.length} posisi terdaftar
            </p>
          </div>
          <Link href="/recruitment/jobs/new" style={{
            padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)',
            color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none',
          }}>
            + Posisi Baru
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {jobs.length === 0 && (
            <div style={{ padding: 'var(--s-8)', textAlign: 'center', color: 'var(--fg-3)', font: '13px/1.6 var(--font-sans)' }}>
              Belum ada posisi kerja. Buat posisi pertama untuk mulai menerima lamaran.
            </div>
          )}
          {jobs.map((job) => (
            <Link key={job.id} href={`/recruitment/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: 'var(--surface)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 'var(--s-4)',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 4 }}>
                    {job.title}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {job.departmentName && <span>{job.departmentName}</span>}
                    <span>{job.headcount} kursi</span>
                    {job.salaryMin && <span>{fmtIDR(Number(job.salaryMin))} – {fmtIDR(Number(job.salaryMax))}</span>}
                    {job.isRemoteFriendly && <span style={{ color: 'var(--teal)' }}>Remote Friendly</span>}
                  </div>
                </div>
                <span style={{
                  font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '4px 8px', borderRadius: 999,
                  color: STATUS_COLOR[job.status] ?? 'var(--fg-3)',
                  border: `1px solid ${STATUS_COLOR[job.status] ?? 'var(--border)'}`,
                }}>
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </RecruitmentShell>
  )
}
