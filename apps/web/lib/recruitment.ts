import 'server-only'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  jobPositions, applications, applicationAttachments,
  applicationStageLog, jobOffers, departments,
  type JobPosition, type Application, type JobOffer,
  type ApplicationStatus, type JobPositionStatus,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { JobPosition, Application, JobOffer, ApplicationStatus, JobPositionStatus }

// ── Job Positions ──────────────────────────────────────────────────────────────

export async function listJobPositions(
  tenantId: string,
  opts: { status?: JobPositionStatus; search?: string } = {},
): Promise<(JobPosition & { departmentName: string | null })[]> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        pos: jobPositions,
        deptName: departments.name,
      })
      .from(jobPositions)
      .leftJoin(departments, eq(jobPositions.departmentId, departments.id))
      .where(and(
        eq(jobPositions.tenantId, tenantId),
        opts.status ? eq(jobPositions.status, opts.status) : undefined,
        opts.search ? ilike(jobPositions.title, `%${opts.search}%`) : undefined,
      ))
      .orderBy(desc(jobPositions.createdAt))

    return rows.map((r) => ({ ...r.pos, departmentName: r.deptName ?? null }))
  })
}

export async function createJobPosition(input: {
  tenantId:     string
  userId:       string
  title:        string
  departmentId?: string | null
  headcount?:   number
  description?: string | null
  requirements?: string | null
  salaryMin?:   number | null
  salaryMax?:   number | null
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Judul posisi wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const [pos] = await tx.insert(jobPositions).values({
      tenantId:     input.tenantId,
      title,
      departmentId: input.departmentId ?? null,
      headcount:    input.headcount ?? 1,
      description:  input.description ?? null,
      requirements: input.requirements ?? null,
      salaryMin:    input.salaryMin ? String(input.salaryMin) : null,
      salaryMax:    input.salaryMax ? String(input.salaryMax) : null,
      createdBy:    input.userId,
    }).returning({ id: jobPositions.id })
    return { ok: true as const, id: pos!.id }
  })
}

export async function updateJobPositionStatus(
  tenantId: string,
  id:       string,
  status:   JobPositionStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const extra: Partial<typeof jobPositions.$inferInsert> = {}
    if (status === 'open') extra.postedAt = new Date()
    if (status === 'closed') extra.closedAt = new Date()

    const [updated] = await tx.update(jobPositions)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(and(eq(jobPositions.id, id), eq(jobPositions.tenantId, tenantId)))
      .returning({ id: jobPositions.id })
    if (!updated) return { ok: false, error: 'Posisi tidak ditemukan.' }
    return { ok: true as const }
  })
}

// ── Applications ──────────────────────────────────────────────────────────────

async function nextAppNumber(tx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const result = await tx.execute(sql`
    INSERT INTO recruit.app_seq (tenant_id, year, seq)
    VALUES (${tenantId}, ${year}, 1)
    ON CONFLICT (tenant_id, year) DO UPDATE SET seq = recruit.app_seq.seq + 1
    RETURNING seq
  `)
  const seq = result.rows[0].seq as number
  return `APP-${year}-${String(seq).padStart(4, '0')}`
}

export async function listApplications(
  tenantId: string,
  opts: { status?: ApplicationStatus; jobPositionId?: string; search?: string } = {},
) {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ app: applications, jobTitle: jobPositions.title })
      .from(applications)
      .leftJoin(jobPositions, eq(applications.jobPositionId, jobPositions.id))
      .where(and(
        eq(applications.tenantId, tenantId),
        opts.status ? eq(applications.status, opts.status) : undefined,
        opts.jobPositionId ? eq(applications.jobPositionId, opts.jobPositionId) : undefined,
        opts.search ? or(
          ilike(applications.candidateName, `%${opts.search}%`),
          ilike(applications.candidateEmail, `%${opts.search}%`),
        ) : undefined,
      ))
      .orderBy(desc(applications.createdAt))

    return rows.map((r) => ({ ...r.app, jobTitle: r.jobTitle ?? null }))
  })
}

export async function getApplication(tenantId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({ app: applications, jobTitle: jobPositions.title })
      .from(applications)
      .leftJoin(jobPositions, eq(applications.jobPositionId, jobPositions.id))
      .where(and(eq(applications.id, id), eq(applications.tenantId, tenantId)))
      .limit(1)
    if (!row) return null

    const attachments = await tx.select().from(applicationAttachments)
      .where(eq(applicationAttachments.applicationId, id))
      .orderBy(asc(applicationAttachments.uploadedAt))

    const stageLog = await tx.select().from(applicationStageLog)
      .where(eq(applicationStageLog.applicationId, id))
      .orderBy(asc(applicationStageLog.changedAt))

    const offers = await tx.select().from(jobOffers)
      .where(eq(jobOffers.applicationId, id))
      .orderBy(desc(jobOffers.createdAt))

    return { ...row.app, jobTitle: row.jobTitle ?? null, attachments, stageLog, offers }
  })
}

export async function createApplication(input: {
  tenantId:       string
  jobPositionId:  string
  candidateName:  string
  candidateEmail: string
  candidatePhone?: string | null
  coverLetter?:   string | null
  source?:        string | null
}): Promise<{ ok: true; id: string; appNumber: string } | { ok: false; error: string }> {
  const name = input.candidateName.trim()
  const email = input.candidateEmail.trim().toLowerCase()
  if (!name) return { ok: false, error: 'Nama kandidat wajib diisi.' }
  if (!email) return { ok: false, error: 'Email kandidat wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const appNumber = await nextAppNumber(tx, input.tenantId)
    const [app] = await tx.insert(applications).values({
      tenantId:       input.tenantId,
      jobPositionId:  input.jobPositionId,
      appNumber,
      candidateName:  name,
      candidateEmail: email,
      candidatePhone: input.candidatePhone ?? null,
      coverLetter:    input.coverLetter ?? null,
      source:         input.source ?? 'careers_portal',
      status:         'new',
    }).returning({ id: applications.id, appNumber: applications.appNumber })

    // Log initial stage
    await tx.insert(applicationStageLog).values({
      applicationId: app!.id,
      fromStatus:    null,
      toStatus:      'new',
    })

    return { ok: true as const, id: app!.id, appNumber: app!.appNumber }
  })
}

export async function advanceApplication(input: {
  tenantId:   string
  id:         string
  toStatus:   ApplicationStatus
  changedBy:  string
  notes?:     string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const [current] = await tx.select({ status: applications.status })
      .from(applications)
      .where(and(eq(applications.id, input.id), eq(applications.tenantId, input.tenantId)))
      .limit(1)
    if (!current) return { ok: false, error: 'Lamaran tidak ditemukan.' }

    await tx.update(applications)
      .set({ status: input.toStatus, updatedAt: new Date() })
      .where(eq(applications.id, input.id))

    await tx.insert(applicationStageLog).values({
      applicationId: input.id,
      fromStatus:    current.status,
      toStatus:      input.toStatus,
      changedBy:     input.changedBy,
      notes:         input.notes ?? null,
    })

    return { ok: true as const }
  })
}

// ── Job Offers ─────────────────────────────────────────────────────────────────

export async function createOffer(input: {
  tenantId:        string
  applicationId:   string
  proposedSalary:  number
  startDate?:      string | null
  notes?:          string | null
  expiresAt?:      Date | null
  createdBy:       string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.proposedSalary <= 0) return { ok: false, error: 'Gaji harus lebih dari 0.' }

  return withTenant(input.tenantId, async (tx) => {
    const [offer] = await tx.insert(jobOffers).values({
      tenantId:       input.tenantId,
      applicationId:  input.applicationId,
      proposedSalary: String(input.proposedSalary),
      startDate:      input.startDate ?? null,
      notes:          input.notes ?? null,
      expiresAt:      input.expiresAt ?? null,
      createdBy:      input.createdBy,
      status:         'draft',
    }).returning({ id: jobOffers.id })
    return { ok: true as const, id: offer!.id }
  })
}

// ── Public careers portal data ─────────────────────────────────────────────────

export async function listOpenJobs(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ pos: jobPositions, deptName: departments.name })
      .from(jobPositions)
      .leftJoin(departments, eq(jobPositions.departmentId, departments.id))
      .where(and(eq(jobPositions.tenantId, tenantId), eq(jobPositions.status, 'open')))
      .orderBy(desc(jobPositions.postedAt))
    return rows.map((r) => ({ ...r.pos, departmentName: r.deptName ?? null }))
  })
}
