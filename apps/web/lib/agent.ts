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
import { withTenant, getDb } from './db'
import { TOOL_SCHEMAS } from './tool-dispatcher'
import type { ToolCallEvent } from './agent-runner'

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
  { name: 'hr.list_employees', module: 'hr', description: 'Cari karyawan dengan filter status/keyword.' },
  { name: 'hr.get_employee', module: 'hr', description: 'Ambil detail satu karyawan berdasarkan UUID.' },
  { name: 'hr.create_employee', module: 'hr', description: 'Daftarkan karyawan baru.' },
  { name: 'hr.update_employee', module: 'hr', description: 'Ubah jabatan, status, departemen, atau tanggal berakhir karyawan.' },
  { name: 'time.log_hours', module: 'time', description: 'Catat jam kerja karyawan untuk suatu tanggal.' },
  { name: 'time.get_weekly_summary', module: 'time', description: 'Ringkasan total jam kerja per karyawan dalam satu minggu.' },
  { name: 'time.list_entries', module: 'time', description: 'Daftar entri timesheet dengan filter karyawan/tanggal.' },
  { name: 'fin.list_accounts', module: 'fin', description: 'Daftar akun dari Bagan Akun (Chart of Accounts).' },
  { name: 'fin.list_invoices', module: 'fin', description: 'Daftar faktur pelanggan dengan filter status.' },
  { name: 'fin.list_bills', module: 'fin', description: 'Daftar tagihan vendor dengan filter status.' },
  { name: 'fin.list_taxes', module: 'fin', description: 'Daftar pajak (PPN, dll.) dengan filter ruang lingkup (sale/purchase).' },
  { name: 'fin.create_invoice', module: 'fin', description: 'Buat faktur pelanggan baru (status draf). Perlu account_id pendapatan. Bisa sertakan tax_ids per baris.' },
  { name: 'inv.list_products', module: 'inv', description: 'Daftar produk/layanan dengan filter tipe atau kata kunci.' },
  { name: 'inv.get_stock', module: 'inv', description: 'Cek stok on-hand untuk satu produk berdasarkan UUID.' },
  { name: 'proc.list_pos', module: 'proc', description: 'Daftar pesanan pembelian (Purchase Order) dengan filter status.' },
  { name: 'sales.list_sos', module: 'sales', description: 'Daftar pesanan penjualan (Sales Order) dengan filter status.' },
  { name: 'crm.list_deals', module: 'crm', description: 'Daftar deal pipeline CRM dengan filter stage.' },
  { name: 'crm.create_deal', module: 'crm', description: 'Buat deal baru di pipeline CRM.' },
  { name: 'crm.move_deal_stage', module: 'crm', description: 'Pindahkan deal ke stage berikutnya atau stage tertentu.' },
  { name: 'doc.list_documents', module: 'doc', description: 'Daftar dokumen/kontrak dengan filter tipe atau status.' },
  { name: 'platform.list_entities',    module: 'platform', description: 'Mengembalikan daftar semua entitas yang terdaftar dalam sistem.' },
  { name: 'platform.describe_entity',  module: 'platform', description: 'Mengembalikan metadata lengkap satu entitas (field, view, perizinan).' },
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
          inputSchema: TOOL_SCHEMAS[t.name] ?? {},
        })),
      )
      .onConflictDoNothing()
      .returning({ id: tools.id })
    return result.length
  })
}

// ── Run management ─────────────────────────────────────────────────────────────

export async function createRun(input: {
  tenantId: string
  agentId: string
  userId: string
  prompt: string
}): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const prompt = input.prompt.trim()
  if (!prompt) return { ok: false, error: 'Prompt tidak boleh kosong.' }
  if (prompt.length > 8000) return { ok: false, error: 'Prompt terlalu panjang (maks 8000 karakter).' }

  return withTenant(input.tenantId, async (tx) => {
    const [agent] = await tx
      .select({ id: agents.id, enabled: agents.enabled })
      .from(agents)
      .where(and(eq(agents.tenantId, input.tenantId), eq(agents.id, input.agentId)))
      .limit(1)
    if (!agent) return { ok: false, error: 'Agen tidak ditemukan.' } as const
    if (!agent.enabled) return { ok: false, error: 'Agen dinonaktifkan.' } as const

    const [run] = await tx
      .insert(agentRuns)
      .values({
        tenantId: input.tenantId,
        agentId: input.agentId,
        createdBy: input.userId,
        status: 'pending',
        input: { prompt },
      })
      .returning({ id: agentRuns.id })

    return { ok: true, runId: run.id } as const
  })
}

export interface RunDetail {
  run: AgentRun
  toolCalls: ToolCallEvent[]
}

export async function getRun(tenantId: string, runId: string): Promise<RunDetail | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.tenantId, tenantId), eq(agentRuns.id, runId)))
      .limit(1),
  )
  const run = rows[0]
  if (!run) return null
  return { run, toolCalls: (run.toolCalls as ToolCallEvent[]) ?? [] }
}

export async function approveRun(
  tenantId: string,
  runId: string,
  approvalOutput?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb()
  const [run] = await db
    .select({ status: agentRuns.status, pendingToolCallId: agentRuns.pendingToolCallId, toolCalls: agentRuns.toolCalls })
    .from(agentRuns)
    .where(and(eq(agentRuns.tenantId, tenantId), eq(agentRuns.id, runId)))
    .limit(1)

  if (!run) return { ok: false, error: 'Run tidak ditemukan.' }
  if (run.status !== 'awaiting_approval') return { ok: false, error: 'Run tidak dalam status awaiting_approval.' }

  // Update the pending tool call's output in the history
  const history = (run.toolCalls as ToolCallEvent[]).map((tc) =>
    tc.id === run.pendingToolCallId
      ? { ...tc, output: approvalOutput ?? { approved: true }, completedAt: new Date().toISOString() }
      : tc,
  )

  await db
    .update(agentRuns)
    .set({ status: 'approved', toolCalls: history })
    .where(eq(agentRuns.id, runId))

  return { ok: true }
}

export async function rejectRun(
  tenantId: string,
  runId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb()
  const [run] = await db
    .select({ status: agentRuns.status, pendingToolCallId: agentRuns.pendingToolCallId, toolCalls: agentRuns.toolCalls })
    .from(agentRuns)
    .where(and(eq(agentRuns.tenantId, tenantId), eq(agentRuns.id, runId)))
    .limit(1)

  if (!run) return { ok: false, error: 'Run tidak ditemukan.' }
  if (run.status !== 'awaiting_approval') return { ok: false, error: 'Run tidak dalam status awaiting_approval.' }

  const history = (run.toolCalls as ToolCallEvent[]).map((tc) =>
    tc.id === run.pendingToolCallId
      ? { ...tc, output: { rejected: true }, error: 'Ditolak oleh pengguna.', completedAt: new Date().toISOString() }
      : tc,
  )

  await db
    .update(agentRuns)
    .set({
      status: 'failed',
      error: 'Run ditolak oleh pengguna pada langkah persetujuan.',
      toolCalls: history,
      completedAt: new Date(),
    })
    .where(eq(agentRuns.id, runId))

  return { ok: true }
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
