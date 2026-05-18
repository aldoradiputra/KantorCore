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
} from '@kantorcore/db'
import { withTenant } from './db'

// ── Agents ────────────────────────────────────────────────────────────────────

export async function listAgents(tenantId: string): Promise<Agent[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(agents).where(eq(agents.tenantId, tenantId)).orderBy(agents.createdAt),
  )
}

export async function getAgent(tenantId: string, agentId: string): Promise<Agent | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(agents)
      .where(and(eq(agents.tenantId, tenantId), eq(agents.id, agentId)))
      .limit(1)
    return rows[0] ?? null
  })
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

  return withTenant(input.tenantId, async (tx) => {
    const [a] = await tx
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
    return { ok: true, agent: a } as const
  })
}

export async function updateAgent(
  tenantId: string,
  agentId: string,
  patch: { name?: string; description?: string; model?: string; systemPrompt?: string; enabled?: boolean },
): Promise<{ ok: true; agent: Agent } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
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
    if (!rows[0]) return { ok: false, error: 'Agen tidak ditemukan.' } as const
    return { ok: true, agent: rows[0] } as const
  })
}

// ── Mandates ──────────────────────────────────────────────────────────────────

export async function listMandates(tenantId: string, agentId: string): Promise<Mandate[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(mandates)
      .where(and(eq(mandates.tenantId, tenantId), eq(mandates.agentId, agentId)))
      .orderBy(mandates.grantedAt),
  )
}

export async function grantMandate(input: {
  tenantId: string
  agentId: string
  toolName: string
  grantedBy: string
  scope?: Record<string, unknown>
}): Promise<{ ok: true; mandate: Mandate } | { ok: false; error: string }> {
  return withTenant(input.tenantId, async (tx) => {
    const [m] = await tx
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
    if (!m) return { ok: false, error: 'Mandat sudah ada.' } as const
    return { ok: true, mandate: m } as const
  })
}

export async function revokeMandate(
  tenantId: string,
  agentId: string,
  toolName: string,
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx
      .delete(mandates)
      .where(
        and(
          eq(mandates.tenantId, tenantId),
          eq(mandates.agentId, agentId),
          eq(mandates.toolName, toolName),
        ),
      ),
  )
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export async function listTools(tenantId: string): Promise<AgentTool[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(tools)
      .where(and(eq(tools.tenantId, tenantId), eq(tools.enabled, true)))
      .orderBy(tools.module, tools.name),
  )
}

/**
 * Default tools available the moment a tenant is provisioned. Real modules
 * will own their own registration once they need it; this baseline lets
 * tenants experiment with mandates without waiting on module activation.
 */
const DEFAULT_TOOLS: ReadonlyArray<{
  name: string
  module: string
  description: string
}> = [
  { name: 'chat.send_message', module: 'chat', description: 'Kirim pesan ke kanal chat.' },
  { name: 'chat.list_channels', module: 'chat', description: 'Baca daftar kanal di ruang kerja.' },
  { name: 'proj.create_issue', module: 'proj', description: 'Buat isu baru di sebuah proyek.' },
  { name: 'proj.update_issue', module: 'proj', description: 'Ubah status, prioritas, atau assignee isu.' },
  { name: 'proj.list_issues', module: 'proj', description: 'Cari isu berdasarkan filter.' },
  { name: 'platform.search', module: 'platform', description: 'Cari entitas di ruang kerja.' },
]

/** Idempotent — re-running on a populated tenant is a no-op. */
export async function seedDefaultTools(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    const result = await tx
      .insert(tools)
      .values(
        DEFAULT_TOOLS.map((t) => ({
          tenantId,
          name: t.name,
          module: t.module,
          description: t.description,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: tools.id })
    return result.length
  })
}

// ── Runs ──────────────────────────────────────────────────────────────────────

export async function listRuns(
  tenantId: string,
  agentId: string,
  limit = 50,
): Promise<AgentRun[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.tenantId, tenantId), eq(agentRuns.agentId, agentId)))
      .orderBy(desc(agentRuns.createdAt))
      .limit(limit),
  )
}

export interface ActiveRunRow {
  run: AgentRun
  agent: { id: string; name: string }
}

/** Lists active runs (pending + running + awaiting_approval) across all agents. */
export async function listActiveRuns(tenantId: string): Promise<ActiveRunRow[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select({
        run: agentRuns,
        agent: { id: agents.id, name: agents.name },
      })
      .from(agentRuns)
      .innerJoin(agents, eq(agentRuns.agentId, agents.id))
      .where(
        and(
          eq(agentRuns.tenantId, tenantId),
          inArray(agentRuns.status, ['pending', 'running', 'awaiting_approval']),
        ),
      )
      .orderBy(desc(agentRuns.createdAt))
      .limit(100),
  )
}

/** Counts active runs (pending + running + awaiting_approval) for inbox badge. */
export async function countActiveRuns(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
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
  })
}
