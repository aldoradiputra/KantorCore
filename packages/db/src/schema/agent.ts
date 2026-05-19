import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * IS-AGENT — Agent Runtime Platform (Phase 1 core, ADR-011).
 *
 * Agents are first-class actors alongside users and service accounts.
 * The tool registry defines what capabilities exist; mandates define
 * what each agent is permitted to call; runs track execution history.
 *
 * RLS deferred — explicit tenant_id filters on every query (same pattern
 * as chat + proj).
 */
export const agent = pgSchema('agent')

// ── Tool registry ─────────────────────────────────────────────────────────────
// Named, typed capabilities that agents (and workflows) can call. Modules
// register their tools here; agents can only invoke tools listed in their
// mandate.
export const tools = agent.table(
  'tools',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Dot-namespaced: module.action, e.g. "proj.create_issue". */
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    /** JSON Schema for the tool's input parameters. */
    inputSchema: jsonb('input_schema').notNull().default({}),
    /** Which module owns this tool. Used for display grouping. */
    module: varchar('module', { length: 32 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantNameUnique: uniqueIndex('agent_tools_tenant_name_unique').on(t.tenantId, t.name),
    tenantIdx: index('agent_tools_tenant_id_idx').on(t.tenantId),
  }),
)

// ── Agent definitions ─────────────────────────────────────────────────────────
export const agents = agent.table(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    /** Claude model ID to use when this agent runs. */
    model: varchar('model', { length: 64 }).notNull().default('claude-sonnet-4-6'),
    systemPrompt: text('system_prompt'),
    enabled: boolean('enabled').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('agent_agents_tenant_id_idx').on(t.tenantId),
  }),
)

// ── Mandates ──────────────────────────────────────────────────────────────────
// A mandate is an explicit authorization granting an agent permission to call
// a specific tool. Agents can only use tools that appear in their mandate set.
// Scope JSONB allows optional constraints (e.g. restrict to one project_id).
export const mandates = agent.table(
  'mandates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    /** Must match a tools.name within the same tenant. */
    toolName: varchar('tool_name', { length: 128 }).notNull(),
    /** Optional constraints, e.g. { "project_id": "uuid..." }. */
    scope: jsonb('scope').notNull().default({}),
    grantedBy: uuid('granted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentToolUnique: uniqueIndex('agent_mandates_agent_tool_unique').on(t.agentId, t.toolName),
    agentIdx: index('agent_mandates_agent_id_idx').on(t.agentId),
    tenantIdx: index('agent_mandates_tenant_id_idx').on(t.tenantId),
  }),
)

// ── Runs ──────────────────────────────────────────────────────────────────────
// Execution log. One row per agent invocation. Status progresses:
//   pending → running → done | failed
//   pending → running → awaiting_approval → running → done | failed
export const agentRuns = agent.table(
  'runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    input: jsonb('input').notNull().default({}),
    output: jsonb('output'),
    error: text('error'),
    /** Ordered array of ToolCallEvent objects — the execution timeline. */
    toolCalls: jsonb('tool_calls').notNull().default([]),
    /** Anthropic message array serialized for resume after awaiting_approval. */
    pendingMessages: jsonb('pending_messages'),
    /** tool_use block ID currently awaiting approval. */
    pendingToolCallId: text('pending_tool_call_id'),
    inputTokens: text('input_tokens'),
    outputTokens: text('output_tokens'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    agentCreatedIdx: index('agent_runs_agent_created_idx').on(t.agentId, t.createdAt),
    tenantStatusIdx: index('agent_runs_tenant_status_idx').on(t.tenantId, t.status),
  }),
)

// ── Types ─────────────────────────────────────────────────────────────────────
export type AgentTool = typeof tools.$inferSelect
export type NewAgentTool = typeof tools.$inferInsert
export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
export type Mandate = typeof mandates.$inferSelect
export type NewMandate = typeof mandates.$inferInsert
export type AgentRun = typeof agentRuns.$inferSelect
export type NewAgentRun = typeof agentRuns.$inferInsert

export type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
