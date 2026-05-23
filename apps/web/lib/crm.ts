import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  deals, activities, contacts, users,
  type Deal, type Activity, type DealStage, type ActivityType,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { Deal, Activity, DealStage, ActivityType }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DealWithActivities {
  deal: Deal
  activities: (Activity & { createdByName: string | null })[]
  contact: { id: string; name: string; email: string | null } | null
}

export const STAGE_ORDER: DealStage[] = [
  'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
]

export const STAGE_LABEL: Record<DealStage, string> = {
  lead:        'Prospek',
  qualified:   'Terverifikasi',
  proposal:    'Penawaran',
  negotiation: 'Negosiasi',
  won:         'Menang',
  lost:        'Kalah',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextDealNumber(tx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(deals)
    .where(
      and(
        eq(deals.tenantId, tenantId),
        sql`EXTRACT(YEAR FROM created_at) = ${year}`,
      ),
    )
  return `CRM/${year}/${String(count + 1).padStart(4, '0')}`
}

// ── List & Get ────────────────────────────────────────────────────────────────

export async function listDeals(
  tenantId: string,
  opts: { stage?: DealStage } = {},
): Promise<Deal[]> {
  return withTenant(tenantId, (tx) => {
    const where = opts.stage
      ? and(eq(deals.tenantId, tenantId), eq(deals.stage, opts.stage))
      : eq(deals.tenantId, tenantId)
    return tx.select().from(deals).where(where!).orderBy(desc(deals.createdAt))
  })
}

export async function getDeal(tenantId: string, id: string): Promise<DealWithActivities | null> {
  return withTenant(tenantId, async (tx) => {
    const [deal] = await tx
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .limit(1)

    if (!deal) return null

    const acts = await tx
      .select({ activity: activities, createdByName: users.name })
      .from(activities)
      .leftJoin(users, eq(activities.createdBy, users.id))
      .where(eq(activities.dealId, id))
      .orderBy(desc(activities.doneAt))

    let contact: DealWithActivities['contact'] = null
    if (deal.contactId) {
      const [c] = await tx
        .select({ id: contacts.id, name: contacts.name, email: contacts.email })
        .from(contacts)
        .where(eq(contacts.id, deal.contactId))
        .limit(1)
      if (c) contact = c
    }

    return {
      deal,
      activities: acts.map((r) => ({ ...r.activity, createdByName: r.createdByName ?? null })),
      contact,
    }
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createDeal(input: {
  tenantId: string
  userId: string
  title: string
  contactId?: string | null
  contactName?: string | null
  expectedValue?: number
  expectedClose?: string | null
  notes?: string | null
  stage?: DealStage
}): Promise<{ ok: true; deal: Deal } | { ok: false; error: string }> {
  if (!input.title.trim()) return { ok: false, error: 'Judul deal wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const dealNumber = await nextDealNumber(tx, input.tenantId)

    const [deal] = await tx
      .insert(deals)
      .values({
        tenantId:      input.tenantId,
        dealNumber,
        title:         input.title.trim(),
        stage:         input.stage ?? 'lead',
        contactId:     input.contactId ?? null,
        contactName:   input.contactName?.trim() ?? null,
        expectedValue: input.expectedValue ?? 0,
        expectedClose: input.expectedClose ?? null,
        notes:         input.notes?.trim() ?? null,
        createdBy:     input.userId,
        assignedTo:    input.userId,
      })
      .returning()

    return { ok: true as const, deal: deal! }
  })
}

// ── Move stage ────────────────────────────────────────────────────────────────

export async function moveDealStage(
  tenantId: string,
  id: string,
  stage: DealStage,
): Promise<{ ok: true; deal: Deal } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .limit(1)

    if (!existing) return { ok: false as const, error: 'Deal tidak ditemukan.' }

    const [updated] = await tx
      .update(deals)
      .set({ stage, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning()

    return { ok: true as const, deal: updated! }
  })
}

// ── Add activity ──────────────────────────────────────────────────────────────

export async function addActivity(input: {
  tenantId: string
  dealId: string
  userId: string
  type: ActivityType
  title: string
  notes?: string | null
}): Promise<{ ok: true; activity: Activity } | { ok: false; error: string }> {
  if (!input.title.trim()) return { ok: false, error: 'Judul aktivitas wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, input.dealId), eq(deals.tenantId, input.tenantId)))
      .limit(1)

    if (!existing) return { ok: false as const, error: 'Deal tidak ditemukan.' }

    const [activity] = await tx
      .insert(activities)
      .values({
        tenantId:  input.tenantId,
        dealId:    input.dealId,
        type:      input.type,
        title:     input.title.trim(),
        notes:     input.notes?.trim() ?? null,
        createdBy: input.userId,
      })
      .returning()

    return { ok: true as const, activity: activity! }
  })
}

// ── Pipeline summary ──────────────────────────────────────────────────────────

export interface PipelineSummary {
  stage: DealStage
  label: string
  count: number
  totalValue: number
  deals: Deal[]
}

export async function getPipelineSummary(tenantId: string): Promise<PipelineSummary[]> {
  const all = await listDeals(tenantId)
  return STAGE_ORDER.map((stage) => {
    const stageDeals = all.filter((d) => d.stage === stage)
    return {
      stage,
      label: STAGE_LABEL[stage],
      count: stageDeals.length,
      totalValue: stageDeals.reduce((s, d) => s + d.expectedValue, 0),
      deals: stageDeals,
    }
  })
}
