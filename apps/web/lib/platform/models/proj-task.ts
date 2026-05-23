import type { ModelMeta } from './types'

/**
 * Mapped to the underlying `proj.issues` table — tasks in proj.project are
 * stored as issues with monotonic per-project numbers (KAN-1, KAN-2, ...).
 */
export const projTaskModel: ModelMeta = {
  entity: 'proj.task',
  module: 'IS-PROJ',
  label:       { id: 'Tugas', en: 'Task' },
  pluralLabel: { id: 'Tugas', en: 'Tasks' },
  displayField: 'title',
  help:
    'Tugas (issue) di dalam proj.project. ID publik dibentuk dari project.key + number (KAN-42). ' +
    'Workflow Linear-style: backlog → todo → in_progress → in_review → done | cancelled. ' +
    'Dapat ditautkan dari hr.timesheet_entry.issueId untuk tracking jam kerja per task.',

  fields: {
    projectId: {
      name: 'projectId',
      label: { id: 'Proyek', en: 'Project' },
      type: 'many2one',
      target: 'proj.project',
      required: true,
    },
    number: {
      name: 'number',
      label: { id: 'Nomor', en: 'Number' },
      type: 'integer',
      required: true,
      readonly: true,
      help: 'Nomor monotonic per project. Digabung dengan project.key → ID publik (mis. KAN-42).',
      tooltip: 'Nomor task di proyek.',
    },
    title: {
      name: 'title',
      label: { id: 'Judul', en: 'Title' },
      type: 'text',
      required: true,
      searchable: true,
    },
    body: {
      name: 'body',
      label: { id: 'Deskripsi', en: 'Body' },
      type: 'longtext',
      widget: 'textarea',
      searchable: true,
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'backlog',
      widget: 'badge',
      options: [
        { value: 'backlog',     label: { id: 'Backlog',       en: 'Backlog' } },
        { value: 'todo',        label: { id: 'Antrian',       en: 'To Do' } },
        { value: 'in_progress', label: { id: 'Berjalan',      en: 'In Progress' } },
        { value: 'in_review',   label: { id: 'Direview',      en: 'In Review' } },
        { value: 'done',        label: { id: 'Selesai',       en: 'Done' } },
        { value: 'cancelled',   label: { id: 'Dibatalkan',    en: 'Cancelled' } },
      ],
    },
    priority: {
      name: 'priority',
      label: { id: 'Prioritas', en: 'Priority' },
      type: 'enum',
      required: true,
      default: 'none',
      widget: 'priority',
      options: [
        { value: 'none',   label: { id: 'Tanpa',    en: 'None' } },
        { value: 'low',    label: { id: 'Rendah',   en: 'Low' } },
        { value: 'medium', label: { id: 'Sedang',   en: 'Medium' } },
        { value: 'high',   label: { id: 'Tinggi',   en: 'High' } },
        { value: 'urgent', label: { id: 'Mendesak', en: 'Urgent' } },
      ],
    },
    assigneeId: {
      name: 'assigneeId',
      label: { id: 'Penerima Tugas', en: 'Assignee' },
      type: 'many2one',
      target: 'platform.user',
      widget: 'avatar-select',
    },
    createdBy: {
      name: 'createdBy',
      label: { id: 'Dibuat Oleh', en: 'Created By' },
      type: 'many2one',
      target: 'platform.user',
      required: true,
      readonly: true,
    },
    createdAt: {
      name: 'createdAt',
      label: { id: 'Dibuat Pada', en: 'Created At' },
      type: 'datetime',
      readonly: true,
    },
    updatedAt: {
      name: 'updatedAt',
      label: { id: 'Diperbarui Pada', en: 'Updated At' },
      type: 'datetime',
      readonly: true,
    },
  },

  views: {
    list: {
      columns: ['number', 'title', 'status', 'priority', 'assigneeId', 'updatedAt'],
      defaultSort: { field: 'updatedAt', direction: 'desc' },
      filters: ['status', 'priority', 'assigneeId', 'projectId'],
    },
    form: {
      rows: [
        'title',
        ['status', 'priority', 'assigneeId'],
      ],
      tabs: [
        {
          id: 'description',
          label: { id: 'Deskripsi', en: 'Description' },
          rows: ['body'],
        },
        {
          id: 'meta',
          label: { id: 'Meta', en: 'Meta' },
          rows: [
            ['projectId', 'number'],
            'createdBy',
          ],
        },
      ],
    },
    kanban: {
      groupBy: 'status',
      cardTitle: 'title',
      cardFields: ['priority', 'assigneeId'],
    },
  },

  perms: {
    create: ['admin', 'member', 'agent'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin', 'member', 'agent'],
    delete: ['admin', 'member'],
  },

  chatter: true,
  activities: true,
}
