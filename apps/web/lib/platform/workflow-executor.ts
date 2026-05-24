import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import {
  processTemplates,
  processSteps,
  processInstances,
  processRunSteps,
  type ProcessInstance,
  type ProcessRunStep,
  type ProcessStep,
} from '@kantorcore/db'
import { withTenant } from '../db'
import { getProcessBySlug } from '../processes'
import { createRecord } from './records'
import { recordAudit } from '../audit'

export type { ProcessInstance, ProcessRunStep }

export interface InstanceWithSteps {
  instance: ProcessInstance
  steps: ProcessRunStep[]
}

// ── Start a new instance ──────────────────────────────────────────────────────

export async function startInstance(input: {
  tenantId: string
  processSlug: string
  triggerRecordType?: string
  triggerRecordId?: string
  actorId?: string
  context?: Record<string, unknown>
}): Promise<{ ok: true; instance: ProcessInstance } | { ok: false; error: string }> {
  const proc = await getProcessBySlug(input.tenantId, input.processSlug)
  if (!proc) return { ok: false, error: `Process '${input.processSlug}' tidak ditemukan.` }

  const instance = await withTenant(input.tenantId, async (tx) => {
    const [inst] = await tx
      .insert(processInstances)
      .values({
        tenantId: input.tenantId,
        processId: proc.template.id,
        triggerRecordType: input.triggerRecordType ?? null,
        triggerRecordId: (input.triggerRecordId as `${string}-${string}-${string}-${string}-${string}` | undefined) ?? null,
        status: 'running',
        currentSequence: 0,
        context: input.context ?? {},
        startedBy: (input.actorId as `${string}-${string}-${string}-${string}-${string}` | undefined) ?? null,
      })
      .returning()
    return inst!
  })

  void runInstance(input.tenantId, instance.id).catch(() => {})

  return { ok: true, instance }
}

// ── Get instance with steps ───────────────────────────────────────────────────

export async function getInstance(
  tenantId: string,
  instanceId: string,
): Promise<InstanceWithSteps | null> {
  return withTenant(tenantId, async (tx) => {
    const [inst] = await tx
      .select()
      .from(processInstances)
      .where(and(eq(processInstances.tenantId, tenantId), eq(processInstances.id, instanceId)))
      .limit(1)
    if (!inst) return null

    const steps = await tx
      .select()
      .from(processRunSteps)
      .where(eq(processRunSteps.instanceId, instanceId))
      .orderBy(asc(processRunSteps.sequence))

    return { instance: inst, steps }
  })
}

export async function listInstances(
  tenantId: string,
  processId?: string,
): Promise<ProcessInstance[]> {
  return withTenant(tenantId, (tx) => {
    const where = processId
      ? and(eq(processInstances.tenantId, tenantId), eq(processInstances.processId, processId))
      : eq(processInstances.tenantId, tenantId)
    return tx
      .select()
      .from(processInstances)
      .where(where!)
      .orderBy(asc(processInstances.createdAt))
  })
}

// ── Advance a paused human step ───────────────────────────────────────────────

export async function advanceHumanStep(input: {
  tenantId: string
  instanceId: string
  stepRunId: string
  actorId: string
  notes?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = await getInstance(input.tenantId, input.instanceId)
  if (!data) return { ok: false, error: 'Instance tidak ditemukan.' }
  if (data.instance.status !== 'paused') {
    return { ok: false, error: 'Instance tidak dalam status paused.' }
  }

  const stepRun = data.steps.find((s) => s.id === input.stepRunId)
  if (!stepRun) return { ok: false, error: 'Step tidak ditemukan.' }
  if (stepRun.status !== 'running') {
    return { ok: false, error: 'Step bukan dalam status running.' }
  }

  await withTenant(input.tenantId, (tx) =>
    tx
      .update(processRunSteps)
      .set({
        status: 'completed',
        completedBy: input.actorId as `${string}-${string}-${string}-${string}-${string}`,
        notes: input.notes ?? null,
        completedAt: new Date(),
      })
      .where(eq(processRunSteps.id, input.stepRunId)),
  )

  void runInstance(input.tenantId, input.instanceId).catch(() => {})

  return { ok: true }
}

// ── Resume from a trigger step ────────────────────────────────────────────────

/**
 * Called by fireEvent when a trigger event fires.
 * Finds all instances paused at a trigger step matching this event and resumes them.
 */
export async function resumeInstancesOnEvent(
  tenantId: string,
  event: string,
  eventContext: Record<string, unknown>,
): Promise<void> {
  try {
    const paused = await withTenant(tenantId, (tx) =>
      tx
        .select()
        .from(processInstances)
        .where(
          and(eq(processInstances.tenantId, tenantId), eq(processInstances.status, 'paused')),
        ),
    )

    for (const inst of paused) {
      const data = await getInstance(tenantId, inst.id)
      if (!data) continue

      const currentStepRun = data.steps.find(
        (s) => s.sequence === inst.currentSequence && s.status === 'running',
      )
      if (!currentStepRun) continue

      // Look up the process step definition
      const [stepDef] = await withTenant(tenantId, (tx) =>
        tx
          .select()
          .from(processSteps)
          .where(eq(processSteps.id, currentStepRun.stepId))
          .limit(1),
      )
      if (!stepDef) continue

      if (stepDef.kind === 'trigger' && triggerMatches(stepDef.trigger, event)) {
        await withTenant(tenantId, (tx) =>
          Promise.all([
            tx
              .update(processRunSteps)
              .set({ status: 'completed', completedAt: new Date() })
              .where(eq(processRunSteps.id, currentStepRun.id)),
            tx
              .update(processInstances)
              .set({ context: { ...inst.context, ...eventContext }, updatedAt: new Date() })
              .where(eq(processInstances.id, inst.id)),
          ]),
        )

        void runInstance(tenantId, inst.id).catch(() => {})
      }
    }
  } catch {
    // non-critical
  }
}

// ── Core run loop ─────────────────────────────────────────────────────────────

async function runInstance(tenantId: string, instanceId: string): Promise<void> {
  const data = await getInstance(tenantId, instanceId)
  if (!data) return
  const { instance } = data

  if (instance.status === 'completed' || instance.status === 'failed' || instance.status === 'cancelled') {
    return
  }

  const proc = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(processTemplates)
      .where(eq(processTemplates.id, instance.processId))
      .limit(1),
  )
  if (!proc[0]) return

  const allSteps = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(processSteps)
      .where(eq(processSteps.processId, instance.processId))
      .orderBy(asc(processSteps.sequence)),
  )

  const nextStep = allSteps.find((s) => s.sequence > instance.currentSequence)
  if (!nextStep) {
    // All steps done
    await withTenant(tenantId, (tx) =>
      tx
        .update(processInstances)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(processInstances.id, instanceId)),
    )
    return
  }

  // Create step run record
  const [stepRun] = await withTenant(tenantId, (tx) =>
    tx
      .insert(processRunSteps)
      .values({
        tenantId,
        instanceId,
        stepId: nextStep.id,
        sequence: nextStep.sequence,
        status: 'running',
        startedAt: new Date(),
      })
      .returning(),
  )
  if (!stepRun) return

  await withTenant(tenantId, (tx) =>
    tx
      .update(processInstances)
      .set({ status: 'running', currentSequence: nextStep.sequence, updatedAt: new Date() })
      .where(eq(processInstances.id, instanceId)),
  )

  if (nextStep.kind === 'action') {
    await executeActionStep(tenantId, instanceId, stepRun.id, nextStep, instance)
  } else if (nextStep.kind === 'human' || nextStep.kind === 'agent') {
    // Pause and wait for human/agent to advance
    await withTenant(tenantId, (tx) =>
      tx
        .update(processInstances)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(processInstances.id, instanceId)),
    )
  } else if (nextStep.kind === 'trigger') {
    // Pause and wait for the trigger event to fire
    await withTenant(tenantId, (tx) =>
      tx
        .update(processInstances)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(processInstances.id, instanceId)),
    )
  } else if (nextStep.kind === 'decision') {
    // Auto-complete decision steps (evaluated by business logic elsewhere)
    await withTenant(tenantId, (tx) =>
      tx
        .update(processRunSteps)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(processRunSteps.id, stepRun.id)),
    )
    void runInstance(tenantId, instanceId).catch(() => {})
  }
}

// ── Action step executor ──────────────────────────────────────────────────────

async function executeActionStep(
  tenantId: string,
  instanceId: string,
  stepRunId: string,
  step: ProcessStep,
  instance: ProcessInstance,
): Promise<void> {
  try {
    let outcomeRecordType: string | undefined
    let outcomeRecordId: string | undefined

    if (step.producesRecordType) {
      // Only handle platform registry records; module records are handled by module code
      const [schema, modelKey] = step.producesRecordType.split('.')
      if (schema === 'platform' && modelKey) {
        const createdRecord = await createRecord({
          tenantId,
          modelKey,
          actorUserId: instance.startedBy ?? 'system',
          values: {},
          custom: {},
        })
        outcomeRecordType = step.producesRecordType
        outcomeRecordId = (createdRecord as Record<string, unknown>)['id'] as string | undefined
        await withTenant(tenantId, (tx) =>
          tx
            .update(processInstances)
            .set({
              context: {
                ...instance.context,
                [`${step.producesRecordType}_id`]: outcomeRecordId,
              },
              updatedAt: new Date(),
            })
            .where(eq(processInstances.id, instanceId)),
        )
      }

      if (step.auditEvent) {
        void recordAudit({
          tenantId,
          actorUserId: instance.startedBy ?? null,
          action: step.auditEvent,
          resourceType: 'flow.process_instances',
          resourceId: instanceId,
        }).catch(() => {})
      }
    }

    await withTenant(tenantId, (tx) =>
      tx
        .update(processRunSteps)
        .set({
          status: 'completed',
          outcomeRecordType: outcomeRecordType ?? null,
          outcomeRecordId: outcomeRecordId as `${string}-${string}-${string}-${string}-${string}` | undefined ?? null,
          completedAt: new Date(),
        })
        .where(eq(processRunSteps.id, stepRunId)),
    )

    // Continue to next step
    void runInstance(tenantId, instanceId).catch(() => {})
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await withTenant(tenantId, (tx) =>
      Promise.all([
        tx
          .update(processRunSteps)
          .set({ status: 'failed', error, completedAt: new Date() })
          .where(eq(processRunSteps.id, stepRunId)),
        tx
          .update(processInstances)
          .set({ status: 'failed', error, updatedAt: new Date() })
          .where(eq(processInstances.id, instanceId)),
      ]),
    )
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerMatches(triggerText: string | null, event: string): boolean {
  if (!triggerText) return false
  // Trigger phrases like "SO.status → confirmed" — match against event key loosely
  const eventLower = event.toLowerCase()
  const triggerLower = triggerText.toLowerCase()
  // Direct match
  if (triggerLower.includes(eventLower)) return true
  // Match common event→trigger mappings
  const eventMap: Record<string, string[]> = {
    'so.confirmed': ['so.status → confirmed', 'so confirmed', 'sales order confirm'],
    'invoice.confirmed': ['bill.status → posted', 'invoice confirm'],
    'bill.confirmed': ['bill.status → posted', 'bill confirm'],
  }
  const patterns = eventMap[eventLower] ?? []
  return patterns.some((p) => triggerLower.includes(p))
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelInstance(
  tenantId: string,
  instanceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .update(processInstances)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(processInstances.tenantId, tenantId),
          eq(processInstances.id, instanceId),
        ),
      )
      .returning({ id: processInstances.id }),
  )
  if (rows.length === 0) return { ok: false, error: 'Instance tidak ditemukan.' }
  return { ok: true }
}
