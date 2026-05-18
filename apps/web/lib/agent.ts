import 'server-only'
import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  agents,
  agentRuns,
  mandates,
  tools,
  type Agent,
  type AgentRun,
  type Mandate,
  type AgentTool,
} from '@kantr/db'
import { getDb } from './db'

// ── Agents ────────────────────────────────────────────────────────────────────

export async function listAgents(tenantId: string): Promise<Agent[]> {
  return getDb()
    .select()
    .from(agents)
    .where(eq(agents.tenantId, tenantId))
    .orderBy(agents.createdAt)
}

export async function getAgent(tenantId: string, agentId: string): Promise<Agent | null> {
  const rows = await getDb()
    .select()
    .from(agents)
    .where(and(eq(agents.tenantId, tenantId), eq(agents.id, agentId)))
    .limit(1)
  return rows[0] ?? null
}

export async function createAgent(input: {
  tenantId: string
  userId: string
  name: string
  description?: string
  model?: string
  systemPrompt?: string
}): Promise<{ ok: true; agent: Agent } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Nama agen wajib diisi.' }
  if (name.length > 128) return { ok: false, error: 'Nama terlalu panjang (maks 128 karakter).' }

  const [a] = await getDb()
    .insert(agents)
    .values({
      tenantId: input.tenantId,
      name,
      description: input.description?.trim() || null,
      model: input.model ?? 'claude-sonnet-4-6',
      systemPrompt: input.systemPrompt?.trim() || null,
      createdBy: input.userId,
    })
    .returning()
  return { ok: true, agent: a }
}

export async function updateAgent(
  tenantId: string,
  agentId: string,
  patch: { name?: string; description?: string; model?: string; systemPrompt?: string; enabled?: boolean },
): Promise<{ ok: true; agent: Agent } | { ok: false; error: string }> {
  const rows = await getDb()
    .update(agents)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() || null } : {}),
      ...(patch.model !== undefined ? { model: patch.model } : {}),
      ...(patch.systemPrompt !== undefined
        ? { systemPrompt: patch.systemPrompt.trim() || null }
        : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(agents.tenantId, tenantId), eq(agents.id, agentId)))
    .returning()
  if (!rows[0]) return { ok: false, error: 'Agen tidak ditemukan.' }
  return { ok: true, agent: rows[0] }
}

// ── Mandates ──────────────────────────────────────────────────────────────────

export async function listMandates(tenantId: string, agentId: string): Promise<Mandate[]> {
  return getDb()
    .select()
    .from(mandates)
    .where(and(eq(mandates.tenantId, tenantId), eq(mandates.agentId, agentId)))
    .orderBy(mandates.grantedAt)
}

export async function grantMandate(input: {
  tenantId: string
  agentId: string
  toolName: string
  grantedBy: string
  scope?: Record<string, unknown>
}): Promise<{ ok: true; mandate: Mandate } | { ok: false; error: string }> {
  const [m] = await getDb()
    .insert(mandates)
    .values({
      tenantId: input.tenantId,
      agentId: input.agentId,
      toolName: input.toolName,
      grantedBy: input.grantedBy,
      scope: input.scope ?? {},
    })
    .onConflictDoNothing()
    .returning()
  if (!m) return { ok: false, error: 'Mandat sudah ada.' }
  return { ok: true, mandate: m }
}

export async function revokeMandate(
  tenantId: string,
  agentId: string,
  toolName: string,
): Promise<void> {
  await getDb()
    .delete(mandates)
    .where(
      and(
        eq(mandates.tenantId, tenantId),
        eq(mandates.agentId, agentId),
        eq(mandates.toolName, toolName),
      ),
    )
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export async function listTools(tenantId: string): Promise<AgentTool[]> {
  return getDb()
    .select()
    .from(tools)
    .where(and(eq(tools.tenantId, tenantId), eq(tools.enabled, true)))
    .orderBy(tools.module, tools.name)
}

// ── Runs ──────────────────────────────────────────────────────────────────────

export async function listRuns(
  tenantId: string,
  agentId: string,
  limit = 50,
): Promise<AgentRun[]> {
  return getDb()
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.tenantId, tenantId), eq(agentRuns.agentId, agentId)))
    .orderBy(desc(agentRuns.createdAt))
    .limit(limit)
}

/** Counts active runs (pending + running + awaiting_approval) for inbox badge. */
export async function countActiveRuns(tenantId: string): Promise<number> {
  const rows = await getDb()
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.tenantId, tenantId),
        inArray(agentRuns.status, ['pending', 'running', 'awaiting_approval']),
      ),
    )
    .limit(99)
  return rows.length
}
