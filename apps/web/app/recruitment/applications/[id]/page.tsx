import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getApplication } from '../../../../lib/recruitment'
import { RecruitmentShell } from '../../RecruitmentShell'
import { ApplicationActions } from './ApplicationActions'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const STATUSES = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'] as const
const STATUS_LABEL: Record<string, string> = {
  new: 'Baru', screening: 'Seleksi', interview: 'Wawancara',
  assessment: 'Tes', offer: 'Penawaran', hired: 'Diterima', rejected: 'Ditolak',
}
const STATUS_COLOR: Record<string, string> = {
  new: '#6B7280', screening: 'var(--indigo)', interview: 'var(--teal)',
  assessment: 'var(--amber)', offer: '#7C3AED', hired: 'var(--teal)', rejected: 'var(--danger)',
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const app = await getApplication(ctx.tenant.id, id)
  if (!app) notFound()

  const stageIdx = STATUSES.indexOf(app.status as any)
  const color = STATUS_COLOR[app.status] ?? 'var(--fg-3)'

  return (
    <RecruitmentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="applications">
      <div style={{ padding: 'var(--s-6)', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        {/* Breadcrumb + header */}
        <div>
          <Link href="/recruitment/applications" style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
            ← Pipeline Lamaran
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
                {app.candidateName}
              </h1>
              <div style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4, fontFamily: 'var(--font-mono, monospace)' }}>
                {app.appNumber}
              </div>
            </div>
            <span style={{
              font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '5px 10px', borderRadius: 999, color, border: `1px solid ${color}`,
            }}>
              {STATUS_LABEL[app.status] ?? app.status}
            </span>
          </div>
        </div>

        {/* Stage progress bar */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUSES.filter((s) => s !== 'rejected').map((s, i) => {
            const isDone = stageIdx > i
            const isActive = app.status === s
            return (
              <div key={s} style={{ flex: 1 }}>
                <div style={{
                  height: 4, borderRadius: 999,
                  background: isDone || isActive ? STATUS_COLOR[s] : 'var(--border)',
                  opacity: isActive ? 1 : isDone ? 0.6 : 1,
                }} />
                <div style={{ font: '10px/1 var(--font-sans)', color: isActive ? STATUS_COLOR[s] : 'var(--fg-3)', marginTop: 4, textAlign: 'center' }}>
                  {STATUS_LABEL[s]}
                </div>
              </div>
            )
          })}
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
          <InfoRow label="Posisi" value={app.jobTitle ?? '—'} />
          <InfoRow label="Email" value={app.candidateEmail} />
          {app.candidatePhone && <InfoRow label="Telepon" value={app.candidatePhone} />}
          {app.source && <InfoRow label="Sumber" value={app.source} />}
          <InfoRow label="Tanggal Masuk" value={new Date(app.createdAt).toLocaleDateString('id-ID')} />
        </div>

        {/* Cover letter */}
        {app.coverLetter && (
          <div style={{ padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Surat Lamaran
            </div>
            <p style={{ font: '13px/1.7 var(--font-sans)', color: 'var(--fg-1)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {app.coverLetter}
            </p>
          </div>
        )}

        {/* Attachments */}
        {app.attachments.length > 0 && (
          <div style={{ padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Lampiran
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {app.attachments.map((a) => (
                <a key={a.id} href={a.fileUrl} target="_blank" rel="noopener" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  font: '13px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none',
                }}>
                  <span>📎</span>
                  <span>{a.name}</span>
                  {a.fileType && <span style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}>{a.fileType}</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Job offers */}
        {app.offers.length > 0 && (
          <div style={{ padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Penawaran Kerja
            </div>
            {app.offers.map((offer) => (
              <div key={offer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: '13px/1 var(--font-sans)' }}>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>
                  Rp {new Intl.NumberFormat('id-ID').format(Number(offer.proposedSalary))} / bulan
                </span>
                <span style={{ color: 'var(--fg-3)', textTransform: 'capitalize' }}>{offer.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stage log */}
        {app.stageLog.length > 0 && (
          <div style={{ padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Riwayat Pipeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {app.stageLog.slice().reverse().map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: 8, font: '12px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
                  <span style={{ color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                    {new Date(log.changedAt).toLocaleDateString('id-ID')}
                  </span>
                  <span>→ <strong style={{ color: STATUS_COLOR[log.toStatus] ?? 'var(--fg-1)' }}>{STATUS_LABEL[log.toStatus] ?? log.toStatus}</strong></span>
                  {log.notes && <span style={{ color: 'var(--fg-3)' }}>— {log.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {app.status !== 'hired' && app.status !== 'rejected' && (
          <ApplicationActions id={app.id} currentStatus={app.status} />
        )}
      </div>
    </RecruitmentShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</div>
    </div>
  )
}
