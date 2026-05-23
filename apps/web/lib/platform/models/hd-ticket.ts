import type { ModelMeta } from './types'

/**
 * EXAMPLE / REFERENCE MODEL.
 * This file is the design proof for the metadata schema. Once approved,
 * the other 16 entities will be backfilled using this as the template.
 */
export const hdTicketModel: ModelMeta = {
  entity: 'hd.ticket',
  module: 'IS-HD',
  label: 'Tiket',
  pluralLabel: 'Tiket',
  displayField: 'subject',
  help:
    'Tiket bantuan pelanggan yang dikelola oleh tim Help Desk. ' +
    'Sumber dapat berupa portal, email, chat, telepon, atau dibuat manual. ' +
    'Memiliki SLA, prioritas, status, dan dapat ditugaskan ke tim atau anggota.',

  fields: {
    ticketNumber: {
      name: 'ticketNumber',
      label: 'Nomor Tiket',
      type: 'text',
      readonly: true,
      help: 'Nomor referensi tiket. Dibuat otomatis saat tiket disimpan.',
      searchable: true,
    },
    subject: {
      name: 'subject',
      label: 'Subjek',
      type: 'text',
      required: true,
      searchable: true,
    },
    status: {
      name: 'status',
      label: 'Status',
      type: 'enum',
      required: true,
      default: 'new',
      widget: 'badge',
      options: [
        { value: 'new',      label: 'Baru' },
        { value: 'open',     label: 'Terbuka' },
        { value: 'pending',  label: 'Menunggu' },
        { value: 'resolved', label: 'Selesai' },
        { value: 'closed',   label: 'Ditutup' },
      ],
    },
    priority: {
      name: 'priority',
      label: 'Prioritas',
      type: 'enum',
      required: true,
      default: 'medium',
      widget: 'priority',
      options: [
        { value: 'low',    label: 'Rendah' },
        { value: 'medium', label: 'Sedang' },
        { value: 'high',   label: 'Tinggi' },
        { value: 'urgent', label: 'Mendesak' },
      ],
    },
    source: {
      name: 'source',
      label: 'Sumber',
      type: 'enum',
      required: true,
      default: 'manual',
      options: [
        { value: 'portal', label: 'Portal' },
        { value: 'email',  label: 'Email' },
        { value: 'chat',   label: 'Chat' },
        { value: 'phone',  label: 'Telepon' },
        { value: 'manual', label: 'Manual' },
      ],
    },
    contactId: {
      name: 'contactId',
      label: 'Kontak',
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
    },
    reporterName: {
      name: 'reporterName',
      label: 'Nama Pelapor',
      type: 'text',
      searchable: true,
    },
    reporterEmail: {
      name: 'reporterEmail',
      label: 'Email Pelapor',
      type: 'email',
      searchable: true,
    },
    teamId: {
      name: 'teamId',
      label: 'Tim',
      type: 'many2one',
      target: 'hd.team',
      widget: 'reference',
    },
    assigneeId: {
      name: 'assigneeId',
      label: 'Penerima Tugas',
      type: 'many2one',
      target: 'platform.user',
      widget: 'avatar-select',
    },
    slaPolicyId: {
      name: 'slaPolicyId',
      label: 'Kebijakan SLA',
      type: 'many2one',
      target: 'hd.sla_policy',
      readonly: true,
      help: 'Dipilih otomatis saat tiket dibuat berdasarkan aturan SLA.',
    },
    slaDueAt: {
      name: 'slaDueAt',
      label: 'Tenggat SLA',
      type: 'datetime',
      readonly: true,
    },
    firstReplyAt: {
      name: 'firstReplyAt',
      label: 'Balasan Pertama',
      type: 'datetime',
      readonly: true,
    },
    resolvedAt: {
      name: 'resolvedAt',
      label: 'Diselesaikan Pada',
      type: 'datetime',
      readonly: true,
    },
    closedAt: {
      name: 'closedAt',
      label: 'Ditutup Pada',
      type: 'datetime',
      readonly: true,
    },
    createdAt: {
      name: 'createdAt',
      label: 'Dibuat Pada',
      type: 'datetime',
      readonly: true,
    },
  },

  views: {
    list: {
      columns: ['ticketNumber', 'subject', 'status', 'priority', 'assigneeId', 'slaDueAt'],
      defaultSort: { field: 'createdAt', direction: 'desc' },
      filters: ['status', 'priority', 'teamId', 'assigneeId'],
    },
    form: {
      rows: [
        'subject',
        ['status', 'priority', 'source'],
      ],
      tabs: [
        {
          id: 'reporter',
          label: 'Pelapor',
          rows: [
            ['contactId', 'reporterName'],
            'reporterEmail',
          ],
        },
        {
          id: 'assignment',
          label: 'Penugasan',
          rows: [
            ['teamId', 'assigneeId'],
            ['slaPolicyId', 'slaDueAt'],
          ],
        },
        {
          id: 'timeline',
          label: 'Linimasa',
          rows: [
            ['firstReplyAt', 'resolvedAt'],
            ['closedAt', 'createdAt'],
          ],
        },
      ],
    },
    kanban: {
      groupBy: 'status',
      cardTitle: 'subject',
      cardFields: ['priority', 'assigneeId', 'slaDueAt'],
    },
  },

  perms: {
    create: ['admin', 'member', 'agent', 'public'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin', 'member', 'agent'],
    delete: ['admin'],
  },

  chatter: true,
  activities: true,
}
