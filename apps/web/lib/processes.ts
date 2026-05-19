import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import {
  processTemplates,
  processSteps,
  type ProcessTemplate,
  type ProcessStep,
  type ProcessMode,
} from '@kantorcore/db'
import { withTenant } from './db'
import { PROCESS_MANIFEST, MANIFEST_VERSION } from './process-manifest'

// ── Seed ──────────────────────────────────────────────────────────────────────

/**
 * Idempotent. Re-running on a populated tenant is a no-op unless a manifest
 * template has a higher version than the stored row, in which case it's
 * upgraded in-place (steps rewritten, template name/description refreshed).
 *
 * Returns the number of templates seeded or upgraded.
 */
export async function seedDefaultProcesses(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    let changed = 0

    for (const seed of PROCESS_MANIFEST) {
      const [existing] = await tx
        .select()
        .from(processTemplates)
        .where(and(eq(processTemplates.tenantId, tenantId), eq(processTemplates.slug, seed.slug)))
        .limit(1)

      if (!existing) {
        const [tpl] = await tx
          .insert(processTemplates)
          .values({
            tenantId,
            slug: seed.slug,
            name: seed.name,
            module: seed.module,
            mode: seed.mode,
            description: seed.description,
            manifestVersion: MANIFEST_VERSION,
            isSystem: true,
          })
          .returning()

        await tx.insert(processSteps).values(
          seed.steps.map((s) => ({
            tenantId,
            processId: tpl!.id,
            sequence: s.sequence,
            kind: s.kind,
            mode: s.mode,
            name: s.name,
            description: s.description,
            trigger: s.trigger ?? null,
            producesRecordType: s.producesRecordType ?? null,
            requiredRole: s.requiredRole ?? null,
            reversible: s.reversible,
            auditEvent: s.auditEvent ?? null,
          })),
        )
        changed++
        continue
      }

      // Upgrade in place if manifest is newer
      if (existing.manifestVersion < MANIFEST_VERSION && existing.isSystem) {
        await tx
          .update(processTemplates)
          .set({
            name: seed.name,
            module: seed.module,
            mode: seed.mode,
            description: seed.description,
            manifestVersion: MANIFEST_VERSION,
            updatedAt: new Date(),
          })
          .where(eq(processTemplates.id, existing.id))

        await tx.delete(processSteps).where(eq(processSteps.processId, existing.id))
        await tx.insert(processSteps).values(
          seed.steps.map((s) => ({
            tenantId,
            processId: existing.id,
            sequence: s.sequence,
            kind: s.kind,
            mode: s.mode,
            name: s.name,
            description: s.description,
            trigger: s.trigger ?? null,
            producesRecordType: s.producesRecordType ?? null,
            requiredRole: s.requiredRole ?? null,
            reversible: s.reversible,
            auditEvent: s.auditEvent ?? null,
          })),
        )
        changed++
      }
    }

    return changed
  })
}

// ── Read ──────────────────────────────────────────────────────────────────────

export interface ProcessTemplateRow extends ProcessTemplate {
  stepCount: number
}

export async function listProcesses(tenantId: string): Promise<ProcessTemplateRow[]> {
  return withTenant(tenantId, async (tx) => {
    const tpls = await tx
      .select()
      .from(processTemplates)
      .where(eq(processTemplates.tenantId, tenantId))
      .orderBy(asc(processTemplates.module), asc(processTemplates.name))

    if (tpls.length === 0) return []

    const steps = await tx
      .select({ processId: processSteps.processId })
      .from(processSteps)
      .where(eq(processSteps.tenantId, tenantId))

    const counts = new Map<string, number>()
    for (const s of steps) counts.set(s.processId, (counts.get(s.processId) ?? 0) + 1)

    return tpls.map((t) => ({ ...t, stepCount: counts.get(t.id) ?? 0 }))
  })
}

export async function getProcessBySlug(
  tenantId: string,
  slug: string,
): Promise<{ template: ProcessTemplate; steps: ProcessStep[] } | null> {
  return withTenant(tenantId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(processTemplates)
      .where(and(eq(processTemplates.tenantId, tenantId), eq(processTemplates.slug, slug)))
      .limit(1)

    if (!tpl) return null

    const steps = await tx
      .select()
      .from(processSteps)
      .where(and(eq(processSteps.tenantId, tenantId), eq(processSteps.processId, tpl.id)))
      .orderBy(asc(processSteps.sequence))

    return { template: tpl, steps }
  })
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const PROCESS_MODE_LABEL: Record<ProcessMode, string> = {
  deterministic: 'Otomatis',
  probabilistic: 'AI',
  hybrid: 'Campuran',
}

export const PROCESS_MODE_DESCRIPTION: Record<ProcessMode, string> = {
  deterministic: 'Aturan pasti — selalu berjalan sama, dapat diaudit penuh.',
  probabilistic: 'Agent memutuskan jalannya berdasarkan konteks.',
  hybrid: 'Sebagian aturan pasti, sebagian dijalankan oleh agent.',
}

export const PROCESS_MODE_COLOR: Record<ProcessMode, string> = {
  deterministic: 'var(--teal)',
  probabilistic: 'var(--indigo)',
  hybrid: 'var(--amber)',
}

export const MODULE_LABEL: Record<string, string> = {
  sales: 'Penjualan',
  fin: 'Keuangan',
  hr: 'SDM',
  rent: 'Sewa',
  proj: 'Proyek',
  inv: 'Gudang',
  chat: 'Chat',
}

export const STEP_KIND_LABEL: Record<string, string> = {
  trigger: 'Pemicu',
  action: 'Aksi sistem',
  decision: 'Keputusan',
  human: 'Manusia',
  agent: 'Agent',
}
