import 'server-only'
import { listChannels, getChannelBySlug, sendMessage } from './chat'
import {
  listProjects,
  getProjectBySlug,
  listIssues,
  createIssue,
  updateIssue,
  getIssueByKey,
} from './proj'
import { searchTenant } from './search'
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
} from './hr'
import { recordAudit } from './audit'
import type { IssuePriority, IssueStatus, EmploymentType, EmployeeStatus } from '@kantorcore/db'

export interface ToolDispatchContext {
  tenantId: string
  /** The user ID to use as actor for mutations (run.createdBy). */
  actorUserId: string
}

export type ToolResult = { ok: true; result: unknown } | { ok: false; error: string }

type ToolImpl = (ctx: ToolDispatchContext, input: Record<string, unknown>) => Promise<ToolResult>

const TOOL_IMPLS: Record<string, ToolImpl> = {
  'chat.list_channels': async ({ tenantId }) => {
    const chs = await listChannels(tenantId)
    return { ok: true, result: chs.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind })) }
  },

  'chat.send_message': async ({ tenantId, actorUserId }, input) => {
    const channelSlug = String(input['channel_slug'] ?? '')
    const content = String(input['content'] ?? '')
    if (!channelSlug) return { ok: false, error: 'channel_slug wajib diisi.' }
    if (!content) return { ok: false, error: 'content wajib diisi.' }

    const channel = await getChannelBySlug(tenantId, channelSlug)
    if (!channel) return { ok: false, error: `Kanal "${channelSlug}" tidak ditemukan.` }

    const result = await sendMessage({ tenantId, channelId: channel.id, authorId: actorUserId, body: content })
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true, result: { messageId: result.message.id, channelSlug } }
  },

  'proj.list_issues': async ({ tenantId }, input) => {
    const projectSlug = input['project_slug'] ? String(input['project_slug']) : null
    const statusFilter = input['status'] ? String(input['status']) : null

    if (!projectSlug) {
      const projects = await listProjects(tenantId)
      return { ok: true, result: projects.map((p) => ({ slug: p.slug, name: p.name, key: p.key })) }
    }

    const project = await getProjectBySlug(tenantId, projectSlug)
    if (!project) return { ok: false, error: `Proyek "${projectSlug}" tidak ditemukan.` }

    const issueRows = await listIssues({ tenantId, projectId: project.id })
    const filtered = statusFilter
      ? issueRows.filter((r) => r.issue.status === statusFilter)
      : issueRows

    return {
      ok: true,
      result: filtered.map((r) => ({
        key: `${project.key}-${r.issue.number}`,
        title: r.issue.title,
        status: r.issue.status,
        priority: r.issue.priority,
        assignee: r.assignee?.name ?? null,
      })),
    }
  },

  'proj.create_issue': async ({ tenantId, actorUserId }, input) => {
    const projectSlug = String(input['project_slug'] ?? '')
    const title = String(input['title'] ?? '')
    if (!projectSlug) return { ok: false, error: 'project_slug wajib diisi.' }
    if (!title) return { ok: false, error: 'title wajib diisi.' }

    const project = await getProjectBySlug(tenantId, projectSlug)
    if (!project) return { ok: false, error: `Proyek "${projectSlug}" tidak ditemukan.` }

    const result = await createIssue({
      tenantId,
      projectId: project.id,
      userId: actorUserId,
      title,
      body: input['description'] ? String(input['description']) : undefined,
      priority: (input['priority'] as IssuePriority) ?? 'none',
    })
    if (!result.ok) return { ok: false, error: result.error }
    return {
      ok: true,
      result: { key: `${project.key}-${result.issue.number}`, title: result.issue.title },
    }
  },

  'proj.update_issue': async ({ tenantId }, input) => {
    const issueKey = String(input['issue_key'] ?? '')
    if (!issueKey) return { ok: false, error: 'issue_key wajib diisi.' }

    const issue = await getIssueByKey(tenantId, issueKey)
    if (!issue) return { ok: false, error: `Issue "${issueKey}" tidak ditemukan.` }

    const patch: Parameters<typeof updateIssue>[0]['patch'] = {}
    if (input['status']) patch.status = input['status'] as IssueStatus
    if (input['priority']) patch.priority = input['priority'] as IssuePriority
    if (input['assignee_id'] !== undefined)
      patch.assigneeId = input['assignee_id'] ? String(input['assignee_id']) : null
    if (input['title']) patch.title = String(input['title'])

    const result = await updateIssue({ tenantId, issueId: issue.id, patch })
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true, result: { updated: issueKey, status: result.issue.status } }
  },

  'platform.search': async ({ tenantId }, input) => {
    const query = String(input['query'] ?? '')
    if (!query) return { ok: false, error: 'query wajib diisi.' }
    const hits = await searchTenant(tenantId, query)
    return { ok: true, result: hits }
  },

  // ── IS-HR tools ─────────────────────────────────────────────────────────────
  'hr.list_employees': async ({ tenantId }, input) => {
    const status = input['status'] ? String(input['status']) as EmployeeStatus : undefined
    const search = input['search'] ? String(input['search']) : undefined
    const list = await listEmployees(tenantId, { status, search }, 50)
    return {
      ok: true,
      result: list.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        name: e.name,
        email: e.email,
        position: e.position,
        department: e.departmentName,
        employmentType: e.employmentType,
        status: e.status,
        hireDate: e.hireDate,
      })),
    }
  },

  'hr.get_employee': async ({ tenantId }, input) => {
    const id = String(input['employee_id'] ?? '')
    if (!id) return { ok: false, error: 'employee_id wajib diisi.' }
    const emp = await getEmployee(tenantId, id)
    if (!emp) return { ok: false, error: `Karyawan "${id}" tidak ditemukan.` }
    return { ok: true, result: emp }
  },

  'hr.create_employee': async ({ tenantId, actorUserId }, input) => {
    const name = String(input['name'] ?? '').trim()
    if (!name) return { ok: false, error: 'name wajib diisi.' }
    const result = await createEmployee(tenantId, {
      name,
      employeeCode: input['employee_code'] ? String(input['employee_code']) : null,
      email: input['email'] ? String(input['email']) : null,
      phone: input['phone'] ? String(input['phone']) : null,
      position: input['position'] ? String(input['position']) : null,
      departmentId: input['department_id'] ? String(input['department_id']) : null,
      employmentType: (input['employment_type'] as EmploymentType) ?? 'full_time',
      hireDate: input['hire_date'] ? String(input['hire_date']) : null,
    })
    if (!result.ok) return { ok: false, error: result.error }
    void recordAudit({
      tenantId,
      actorUserId,
      action: 'hr.employee_create',
      resourceType: 'employee',
      resourceId: result.employee.id,
      payload: { name: result.employee.name, via: 'agent' },
    })
    return { ok: true, result: { id: result.employee.id, name: result.employee.name } }
  },

  'hr.update_employee': async ({ tenantId, actorUserId }, input) => {
    const id = String(input['employee_id'] ?? '')
    if (!id) return { ok: false, error: 'employee_id wajib diisi.' }
    const patch: Parameters<typeof updateEmployee>[2] = {}
    if (input['name']) patch.name = String(input['name'])
    if (input['position']) patch.position = String(input['position'])
    if (input['department_id'] !== undefined) {
      patch.departmentId = input['department_id'] ? String(input['department_id']) : null
    }
    if (input['status']) patch.status = input['status'] as EmployeeStatus
    if (input['employment_type']) patch.employmentType = input['employment_type'] as EmploymentType
    if (input['termination_date'] !== undefined) {
      patch.terminationDate = input['termination_date'] ? String(input['termination_date']) : null
    }

    const result = await updateEmployee(tenantId, id, patch)
    if (!result.ok) return { ok: false, error: result.error }
    void recordAudit({
      tenantId,
      actorUserId,
      action: 'hr.employee_update',
      resourceType: 'employee',
      resourceId: id,
      payload: { changes: Object.keys(patch), via: 'agent' },
    })
    return { ok: true, result: { id, status: result.employee.status } }
  },
}

export async function dispatchTool(
  toolName: string,
  ctx: ToolDispatchContext,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const impl = TOOL_IMPLS[toolName]
  if (!impl) return { ok: false, error: `Tool "${toolName}" tidak dikenal.` }
  try {
    return await impl(ctx, input)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** JSON Schema definitions for each built-in tool — used to seed agent.tools. */
export const TOOL_SCHEMAS: Record<string, object> = {
  'chat.list_channels': { type: 'object', properties: {} },
  'chat.send_message': {
    type: 'object',
    properties: {
      channel_slug: { type: 'string', description: 'Slug kanal tujuan (misal: "general")' },
      content: { type: 'string', description: 'Isi pesan yang akan dikirim' },
    },
    required: ['channel_slug', 'content'],
  },
  'proj.list_issues': {
    type: 'object',
    properties: {
      project_slug: { type: 'string', description: 'Slug proyek (opsional — tanpa ini, daftar proyek dikembalikan)' },
      status: {
        type: 'string',
        enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
        description: 'Filter status (opsional)',
      },
    },
  },
  'proj.create_issue': {
    type: 'object',
    properties: {
      project_slug: { type: 'string', description: 'Slug proyek target' },
      title: { type: 'string', description: 'Judul isu' },
      description: { type: 'string', description: 'Deskripsi isu (opsional)' },
      priority: {
        type: 'string',
        enum: ['urgent', 'high', 'medium', 'low', 'none'],
        description: 'Prioritas (default: none)',
      },
    },
    required: ['project_slug', 'title'],
  },
  'proj.update_issue': {
    type: 'object',
    properties: {
      issue_key: { type: 'string', description: 'Kunci isu, misal "KAN-42"' },
      status: {
        type: 'string',
        enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
      },
      priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low', 'none'] },
      assignee_id: { type: 'string', description: 'UUID member yang ditugaskan (null untuk unassign)' },
      title: { type: 'string', description: 'Judul baru (opsional)' },
    },
    required: ['issue_key'],
  },
  'platform.search': {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Kata kunci pencarian' },
    },
    required: ['query'],
  },
  'hr.list_employees': {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['active', 'inactive', 'terminated'], description: 'Filter status (opsional)' },
      search: { type: 'string', description: 'Cari berdasarkan nama, email, jabatan, atau kode' },
    },
  },
  'hr.get_employee': {
    type: 'object',
    properties: {
      employee_id: { type: 'string', description: 'UUID karyawan' },
    },
    required: ['employee_id'],
  },
  'hr.create_employee': {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nama lengkap karyawan' },
      employee_code: { type: 'string', description: 'Kode karyawan (opsional, contoh: EMP-001)' },
      email: { type: 'string' },
      phone: { type: 'string' },
      position: { type: 'string', description: 'Jabatan' },
      department_id: { type: 'string', description: 'UUID departemen (opsional)' },
      employment_type: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'] },
      hire_date: { type: 'string', description: 'Tanggal bergabung (YYYY-MM-DD)' },
    },
    required: ['name'],
  },
  'hr.update_employee': {
    type: 'object',
    properties: {
      employee_id: { type: 'string', description: 'UUID karyawan' },
      name: { type: 'string' },
      position: { type: 'string' },
      department_id: { type: 'string', description: 'UUID departemen baru (null untuk lepas dari dept)' },
      status: { type: 'string', enum: ['active', 'inactive', 'terminated'] },
      employment_type: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'] },
      termination_date: { type: 'string', description: 'Tanggal berakhir (YYYY-MM-DD)' },
    },
    required: ['employee_id'],
  },
}
