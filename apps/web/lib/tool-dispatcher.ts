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
import {
  listTimesheetEntries,
  createTimesheetEntry,
  getWeeklySummary,
  weekStart,
  weekEnd,
  formatDuration,
} from './timesheet'
import {
  listAccounts,
  listInvoices,
  listBills,
  listTaxes,
  createInvoice,
  createBill,
  formatIDR,
} from './finance'
import { listProducts } from './products'
import { getOnHand } from './inventory'
import { listPOs } from './procurement'
import { listSOs } from './sales'
import { listDeals, createDeal, moveDealStage } from './crm'
import { listDocuments } from './documents'
import { recordAudit } from './audit'
import type { IssuePriority, IssueStatus, EmploymentType, EmployeeStatus, DealStage } from '@kantorcore/db'
import { MODEL_REGISTRY, getModel } from './platform/models'

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

  // ── IS-TIME tools ─────────────────────────────────────────────────────────────
  'time.log_hours': async ({ tenantId, actorUserId }, input) => {
    const employeeId = String(input['employee_id'] ?? '')
    if (!employeeId) return { ok: false, error: 'employee_id wajib diisi.' }
    const date = input['date'] ? String(input['date']) : new Date().toISOString().slice(0, 10)
    const durationMinutes = input['duration_minutes']
      ? Math.round(Number(input['duration_minutes']))
      : input['hours']
      ? Math.round(Number(input['hours']) * 60)
      : 0

    if (durationMinutes <= 0) return { ok: false, error: 'Durasi harus lebih dari 0.' }

    const result = await createTimesheetEntry(tenantId, actorUserId, {
      employeeId,
      date,
      durationMinutes,
      description: input['description'] ? String(input['description']) : null,
      billable: input['billable'] !== false,
      projectId: input['project_id'] ? String(input['project_id']) : null,
    })
    if (!result.ok) return { ok: false, error: result.error }
    void recordAudit({
      tenantId,
      actorUserId,
      action: 'time.entry_create',
      resourceType: 'timesheet_entry',
      resourceId: result.entry.id,
      payload: { employeeId, date, durationMinutes, via: 'agent' },
    })
    return { ok: true, result: { id: result.entry.id, date, durationMinutes: formatDuration(durationMinutes) } }
  },

  'time.get_weekly_summary': async ({ tenantId }, input) => {
    const dateStr = input['date'] ? String(input['date']) : new Date().toISOString().slice(0, 10)
    const ws = weekStart(dateStr)
    const we = weekEnd(ws)
    const employeeId = input['employee_id'] ? String(input['employee_id']) : undefined

    const rows = await getWeeklySummary(tenantId, ws, we, employeeId)
    const byEmployee = new Map<string, { name: string; totalMinutes: number; billableMinutes: number }>()
    for (const r of rows) {
      const e = byEmployee.get(r.employeeId) ?? { name: r.employeeName, totalMinutes: 0, billableMinutes: 0 }
      e.totalMinutes += r.totalMinutes
      e.billableMinutes += r.billableMinutes
      byEmployee.set(r.employeeId, e)
    }

    return {
      ok: true,
      result: {
        week: `${ws} — ${we}`,
        employees: [...byEmployee.entries()].map(([id, v]) => ({
          employeeId: id,
          name: v.name,
          total: formatDuration(v.totalMinutes),
          billable: formatDuration(v.billableMinutes),
        })),
      },
    }
  },

  'time.list_entries': async ({ tenantId }, input) => {
    const employeeId = input['employee_id'] ? String(input['employee_id']) : undefined
    const dateFrom = input['date_from'] ? String(input['date_from']) : undefined
    const dateTo = input['date_to'] ? String(input['date_to']) : undefined
    const list = await listTimesheetEntries(tenantId, { employeeId, dateFrom, dateTo }, 50)
    return {
      ok: true,
      result: list.map((e) => ({
        id: e.id,
        employee: e.employeeName,
        date: e.date,
        duration: formatDuration(e.durationMinutes),
        billable: e.billable,
        description: e.description,
      })),
    }
  },

  'fin.list_accounts': async ({ tenantId }, input) => {
    const type = input['type'] ? String(input['type']) : undefined
    const list = await listAccounts(tenantId)
    const filtered = type ? list.filter((a) => a.type === type) : list
    return {
      ok: true,
      result: filtered.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })),
    }
  },

  'fin.list_invoices': async ({ tenantId }, input) => {
    const status = input['status'] ? (String(input['status']) as 'draft' | 'confirmed' | 'paid' | 'cancelled') : undefined
    const list = await listInvoices(tenantId, status ? { status } : {}, 50)
    return {
      ok: true,
      result: list.map((i) => ({
        id: i.id,
        number: i.invoiceNumber,
        customer: i.customerName,
        date: i.date,
        dueDate: i.dueDate,
        total: formatIDR(i.total),
        status: i.status,
      })),
    }
  },

  'fin.list_taxes': async ({ tenantId }, input) => {
    const scope = input['scope'] ? (String(input['scope']) as 'sale' | 'purchase') : undefined
    const activeOnly = input['active_only'] !== false
    const list = await listTaxes(tenantId, { scope, activeOnly })
    return {
      ok: true,
      result: list.map((t) => ({
        id: t.id,
        name: t.name,
        scope: t.scope,
        amount_type: t.amountType,
        amount: t.amount,
        rate: t.amountType === 'percent' ? `${(t.amount / 100).toFixed(2)}%` : `IDR ${t.amount}`,
        account: `${t.accountCode} ${t.accountName}`,
        group: t.groupName,
        price_include: t.priceInclude,
        is_withholding: t.isWithholding,
      })),
    }
  },

  'fin.list_bills': async ({ tenantId }, input) => {
    const status = input['status'] ? (String(input['status']) as 'draft' | 'confirmed' | 'paid' | 'cancelled') : undefined
    const list = await listBills(tenantId, status ? { status } : {}, 50)
    return {
      ok: true,
      result: list.map((b) => ({
        id: b.id,
        number: b.billNumber,
        vendor: b.vendorName,
        date: b.date,
        dueDate: b.dueDate,
        total: formatIDR(b.total),
        status: b.status,
      })),
    }
  },

  'fin.create_invoice': async ({ tenantId, actorUserId }, input) => {
    const customerName = String(input['customer_name'] ?? '').trim()
    if (!customerName) return { ok: false, error: 'customer_name wajib diisi.' }
    const lines = (input['lines'] as Array<Record<string, unknown>>) ?? []
    if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: 'lines wajib berisi minimal satu baris.' }

    const today = new Date().toISOString().slice(0, 10)
    const date = input['date'] ? String(input['date']) : today
    const dueDate = input['due_date'] ? String(input['due_date']) : today

    const parsedLines = lines.map((l) => ({
      description: String(l['description'] ?? ''),
      quantity: Number(l['quantity'] ?? 1),
      unitPrice: Number(l['unit_price'] ?? 0),
      accountId: String(l['account_id'] ?? ''),
      taxIds: Array.isArray(l['tax_ids']) ? (l['tax_ids'] as unknown[]).map((x) => String(x)) : [],
    }))
    for (const l of parsedLines) {
      if (!l.description || !l.accountId || l.quantity <= 0 || l.unitPrice < 0) {
        return { ok: false, error: 'Baris faktur tidak valid (description, account_id, quantity > 0, unit_price >= 0 wajib).' }
      }
    }

    const inv = await createInvoice({
      tenantId,
      userId: actorUserId,
      customerName,
      customerEmail: input['customer_email'] ? String(input['customer_email']) : null,
      date,
      dueDate,
      notes: input['notes'] ? String(input['notes']) : null,
      lines: parsedLines,
    })
    void recordAudit({
      tenantId,
      actorUserId,
      action: 'fin.invoice_create',
      resourceType: 'invoice',
      resourceId: inv.id,
      payload: { invoiceNumber: inv.invoiceNumber, via: 'agent' },
    })
    return { ok: true, result: { id: inv.id, invoiceNumber: inv.invoiceNumber } }
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

  'inv.list_products': async ({ tenantId }, input) => {
    const search = input['search'] ? String(input['search']) : undefined
    const typeFilter = input['type'] ? String(input['type']) : undefined
    const rows = await listProducts(tenantId, { search })
    const filtered = typeFilter ? rows.filter((r) => r.product.type === typeFilter) : rows
    return {
      ok: true,
      result: filtered.map((r) => ({
        id: r.product.id,
        name: r.product.name,
        code: r.product.code,
        type: r.product.type,
        salePrice: formatIDR(r.product.salePrice),
        costPrice: formatIDR(r.product.costPrice),
        category: r.categoryName ?? null,
        uom: r.uomSymbol ?? null,
      })),
    }
  },

  'inv.get_stock': async ({ tenantId }, input) => {
    const productId = String(input['product_id'] ?? '')
    if (!productId) return { ok: false, error: 'product_id wajib diisi.' }
    const qty = await getOnHand(tenantId, productId)
    return { ok: true, result: { productId, onHand: qty } }
  },

  'proc.list_pos': async ({ tenantId }, input) => {
    const status = input['status'] ? String(input['status']) as 'draft' | 'confirmed' | 'received' | 'billed' | 'cancelled' : undefined
    const pos = await listPOs(tenantId, status ? { status } : {})
    return {
      ok: true,
      result: pos.map((p) => ({
        id: p.id,
        number: p.poNumber,
        status: p.status,
        date: p.date,
        expectedDate: p.expectedDate,
      })),
    }
  },

  'sales.list_sos': async ({ tenantId }, input) => {
    const status = input['status'] ? String(input['status']) as 'quotation' | 'confirmed' | 'done' | 'cancelled' : undefined
    const sos = await listSOs(tenantId, status ? { status } : {})
    return {
      ok: true,
      result: sos.map((s) => ({
        id: s.id,
        number: s.soNumber,
        status: s.status,
        date: s.date,
      })),
    }
  },

  'crm.list_deals': async ({ tenantId }, input) => {
    const stage = input['stage'] ? String(input['stage']) as DealStage : undefined
    const dealList = await listDeals(tenantId, stage ? { stage } : {})
    return {
      ok: true,
      result: dealList.map((d) => ({
        id: d.id,
        title: d.title,
        stage: d.stage,
        expectedValue: d.expectedValue != null ? formatIDR(d.expectedValue) : null,
        expectedClose: d.expectedClose,
      })),
    }
  },

  'crm.create_deal': async ({ tenantId, actorUserId }, input) => {
    const title = String(input['title'] ?? '').trim()
    if (!title) return { ok: false, error: 'title wajib diisi.' }
    const expectedValue = input['expected_value'] != null ? Number(input['expected_value']) : undefined
    const expectedClose = input['expected_close'] ? String(input['expected_close']) : null
    const notes = input['notes'] ? String(input['notes']) : null

    const result = await createDeal({
      tenantId,
      userId: actorUserId,
      title,
      contactId: input['contact_id'] ? String(input['contact_id']) : null,
      expectedValue: expectedValue != null && !isNaN(expectedValue) ? expectedValue : undefined,
      expectedClose,
      notes,
    })
    if (!result.ok) return { ok: false, error: result.error }
    void recordAudit({
      tenantId,
      actorUserId,
      action: 'crm.deal_create',
      resourceType: 'deal',
      resourceId: result.deal.id,
      payload: { title, via: 'agent' },
    })
    return { ok: true, result: { id: result.deal.id, title, stage: result.deal.stage } }
  },

  'crm.move_deal_stage': async ({ tenantId, actorUserId }, input) => {
    const dealId = String(input['deal_id'] ?? '')
    const stage = String(input['stage'] ?? '') as DealStage
    if (!dealId) return { ok: false, error: 'deal_id wajib diisi.' }
    const validStages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    if (!validStages.includes(stage)) return { ok: false, error: `stage tidak valid. Pilih: ${validStages.join(', ')}` }

    const result = await moveDealStage(tenantId, dealId, stage)
    if (!result.ok) return { ok: false, error: result.error }
    void recordAudit({
      tenantId,
      actorUserId,
      action: 'crm.deal_stage_move',
      resourceType: 'deal',
      resourceId: dealId,
      payload: { stage, via: 'agent' },
    })
    return { ok: true, result: { id: dealId, stage } }
  },

  'platform.list_entities': async () => {
    const entities = Object.values(MODEL_REGISTRY).map((m) => ({
      entity: m.entity,
      module: m.module,
      label: m.label.id,
      chatter: m.chatter ?? false,
      activities: m.activities ?? false,
    }))
    return { ok: true, result: { count: entities.length, entities } }
  },

  'platform.describe_entity': async (_ctx, input) => {
    const entity = String(input['entity'] ?? '').trim()
    if (!entity) return { ok: false, error: 'Parameter "entity" wajib diisi.' }
    const model = getModel(entity)
    if (!model) return { ok: false, error: `Entitas '${entity}' tidak ditemukan.` }
    // Project field metadata into a compact LLM-friendly shape
    const fields = Object.values(model.fields).map((f) => ({
      name: f.name,
      label: f.label.id,
      type: f.type,
      required: f.required ?? false,
      readonly: f.readonly ?? false,
      target: f.target,
      options: f.options?.map((o) => ({ value: o.value, label: o.label.id })),
      help: f.help,
    }))
    return {
      ok: true,
      result: {
        entity: model.entity,
        module: model.module,
        label: model.label.id,
        pluralLabel: model.pluralLabel.id,
        displayField: model.displayField,
        help: model.help,
        chatter: model.chatter ?? false,
        activities: model.activities ?? false,
        fields,
        listColumns: model.views.list?.columns ?? [],
        kanbanGroupBy: model.views.kanban?.groupBy,
        permissions: model.perms,
      },
    }
  },

  'doc.list_documents': async ({ tenantId }, input) => {
    const status = input['status'] ? String(input['status']) as 'draft' | 'active' | 'expired' | 'terminated' : undefined
    const type = input['type'] ? String(input['type']) as 'contract' | 'nda' | 'mou' | 'agreement' | 'po' | 'invoice' | 'permit' | 'other' : undefined
    const docs = await listDocuments(tenantId, { status, type })
    return {
      ok: true,
      result: docs.map((d) => ({
        id: d.doc.id,
        number: d.doc.docNumber,
        title: d.doc.title,
        type: d.doc.type,
        status: d.doc.status,
        contact: d.contactName ?? d.doc.partyName ?? null,
        expiryDate: d.doc.expiryDate,
        daysUntilExpiry: d.daysUntilExpiry,
      })),
    }
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
  'time.log_hours': {
    type: 'object',
    properties: {
      employee_id: { type: 'string', description: 'UUID karyawan' },
      date: { type: 'string', description: 'Tanggal (YYYY-MM-DD, default: hari ini)' },
      hours: { type: 'number', description: 'Jumlah jam (misal: 1.5 untuk 90 menit)' },
      duration_minutes: { type: 'integer', description: 'Durasi dalam menit (alternatif dari hours)' },
      description: { type: 'string', description: 'Deskripsi pekerjaan (opsional)' },
      billable: { type: 'boolean', description: 'Apakah billable? (default: true)' },
      project_id: { type: 'string', description: 'UUID proyek (opsional)' },
    },
    required: ['employee_id'],
  },
  'time.get_weekly_summary': {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Tanggal dalam minggu yang ingin dilihat (YYYY-MM-DD, default: hari ini)' },
      employee_id: { type: 'string', description: 'Filter ke satu karyawan (opsional)' },
    },
  },
  'time.list_entries': {
    type: 'object',
    properties: {
      employee_id: { type: 'string', description: 'Filter ke satu karyawan (opsional)' },
      date_from: { type: 'string', description: 'Dari tanggal (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'Sampai tanggal (YYYY-MM-DD)' },
    },
  },
  'fin.list_accounts': {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], description: 'Filter berdasarkan jenis akun (opsional)' },
    },
  },
  'fin.list_invoices': {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['draft', 'confirmed', 'paid', 'cancelled'], description: 'Filter status (opsional)' },
    },
  },
  'fin.list_bills': {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['draft', 'confirmed', 'paid', 'cancelled'], description: 'Filter status (opsional)' },
    },
  },
  'fin.list_taxes': {
    type: 'object',
    properties: {
      scope: { type: 'string', enum: ['sale', 'purchase'], description: 'Filter ruang lingkup pajak (opsional)' },
      active_only: { type: 'boolean', description: 'Hanya tampilkan pajak aktif (default true)' },
    },
  },
  'fin.create_invoice': {
    type: 'object',
    properties: {
      customer_name: { type: 'string', description: 'Nama pelanggan' },
      customer_email: { type: 'string' },
      date: { type: 'string', description: 'Tanggal faktur (YYYY-MM-DD, default: hari ini)' },
      due_date: { type: 'string', description: 'Tanggal jatuh tempo (YYYY-MM-DD, default: hari ini)' },
      notes: { type: 'string' },
      lines: {
        type: 'array',
        description: 'Baris faktur',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'integer', minimum: 1 },
            unit_price: { type: 'integer', description: 'Harga satuan dalam IDR (tanpa desimal)' },
            account_id: { type: 'string', description: 'UUID akun pendapatan (gunakan fin.list_accounts type=revenue)' },
            tax_ids: { type: 'array', items: { type: 'string' }, description: 'UUID pajak yang dikenakan (opsional, gunakan fin.list_taxes scope=sale)' },
          },
          required: ['description', 'quantity', 'unit_price', 'account_id'],
        },
      },
    },
    required: ['customer_name', 'lines'],
  },
  'inv.list_products': {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Cari berdasarkan nama, kode produk (opsional)' },
      type: { type: 'string', enum: ['product', 'service', 'consumable'], description: 'Filter tipe produk (opsional)' },
    },
  },
  'inv.get_stock': {
    type: 'object',
    properties: {
      product_id: { type: 'string', description: 'UUID produk (gunakan inv.list_products untuk mendapatkan ID)' },
    },
    required: ['product_id'],
  },
  'proc.list_pos': {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['draft', 'confirmed', 'received', 'billed', 'cancelled'],
        description: 'Filter status PO (opsional)',
      },
    },
  },
  'sales.list_sos': {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['quotation', 'confirmed', 'done', 'cancelled'],
        description: 'Filter status SO (opsional)',
      },
    },
  },
  'crm.list_deals': {
    type: 'object',
    properties: {
      stage: {
        type: 'string',
        enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
        description: 'Filter stage deal (opsional)',
      },
    },
  },
  'crm.create_deal': {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Judul deal' },
      contact_id: { type: 'string', description: 'UUID kontak terkait (opsional)' },
      expected_value: { type: 'integer', description: 'Nilai deal dalam IDR (opsional)' },
      expected_close: { type: 'string', description: 'Tanggal target close (YYYY-MM-DD, opsional)' },
      notes: { type: 'string', description: 'Catatan awal (opsional)' },
    },
    required: ['title'],
  },
  'crm.move_deal_stage': {
    type: 'object',
    properties: {
      deal_id: { type: 'string', description: 'UUID deal (gunakan crm.list_deals)' },
      stage: {
        type: 'string',
        enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
        description: 'Stage tujuan',
      },
    },
    required: ['deal_id', 'stage'],
  },
  'doc.list_documents': {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['draft', 'active', 'expired', 'terminated'],
        description: 'Filter status dokumen (opsional)',
      },
      type: {
        type: 'string',
        enum: ['contract', 'nda', 'mou', 'agreement', 'po', 'invoice', 'permit', 'other'],
        description: 'Filter tipe dokumen (opsional)',
      },
    },
  },
  'platform.list_entities': {
    type: 'object',
    properties: {},
    description: 'Mengembalikan daftar semua entitas yang terdaftar dalam sistem (modul, label, apakah memiliki chatter/aktivitas).',
  },
  'platform.describe_entity': {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Nama entitas dengan namespace, contoh: "hd.ticket", "crm.deal", "fin.invoice".',
      },
    },
    required: ['entity'],
    description: 'Mengembalikan metadata lengkap satu entitas: daftar field (tipe, label, opsi enum), view list/kanban, perizinan, dan deskripsi bisnis.',
  },
}
