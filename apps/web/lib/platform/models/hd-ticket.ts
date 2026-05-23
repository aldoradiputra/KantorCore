import type { ModelMeta } from './types'

export const hdTicketModel: ModelMeta = {
  entity: 'hd.ticket',
  module: 'IS-HD',
  label:       { id: 'Tiket',   en: 'Ticket' },
  pluralLabel: { id: 'Tiket',   en: 'Tickets' },
  displayField: 'subject',
  help:
    'Tiket bantuan pelanggan yang dikelola oleh tim Help Desk. ' +
    'Sumber bisa dari portal, email, chat, telepon, atau dibuat manual. ' +
    'Memiliki SLA, prioritas, status, dan dapat ditugaskan ke tim atau anggota. ' +
    'Terhubung ke crm.contact untuk histori pelanggan.',

  fields: {
    ticketNumber: {
      name: 'ticketNumber',
      label: { id: 'Nomor Tiket', en: 'Ticket Number' },
      type: 'text',
      readonly: true,
      searchable: true,
      help: 'Nomor referensi tiket. Dibuat otomatis saat tiket disimpan.',
      tooltip: 'Nomor unik tiket.',
    },
    subject: {
      name: 'subject',
      label: { id: 'Subjek', en: 'Subject' },
      type: 'text',
      required: true,
      searchable: true,
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'new',
      widget: 'badge',
      options: [
        { value: 'new',      label: { id: 'Baru',      en: 'New' } },
        { value: 'open',     label: { id: 'Terbuka',   en: 'Open' } },
        { value: 'pending',  label: { id: 'Menunggu',  en: 'Pending' } },
        { value: 'resolved', label: { id: 'Selesai',   en: 'Resolved' } },
        { value: 'closed',   label: { id: 'Ditutup',   en: 'Closed' } },
      ],
    },
    priority: {
      name: 'priority',
      label: { id: 'Prioritas', en: 'Priority' },
      type: 'enum',
      required: true,
      default: 'medium',
      widget: 'priority',
      options: [
        { value: 'low',    label: { id: 'Rendah',    en: 'Low' } },
        { value: 'medium', label: { id: 'Sedang',    en: 'Medium' } },
        { value: 'high',   label: { id: 'Tinggi',    en: 'High' } },
        { value: 'urgent', label: { id: 'Mendesak',  en: 'Urgent' } },
      ],
    },
    source: {
      name: 'source',
      label: { id: 'Sumber', en: 'Source' },
      type: 'enum',
      required: true,
      default: 'manual',
      options: [
        { value: 'portal', label: { id: 'Portal',    en: 'Portal' } },
        { value: 'email',  label: { id: 'Email',     en: 'Email' } },
        { value: 'chat',   label: { id: 'Chat',      en: 'Chat' } },
        { value: 'phone',  label: { id: 'Telepon',   en: 'Phone' } },
        { value: 'manual', label: { id: 'Manual',    en: 'Manual' } },
      ],
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Kontak', en: 'Contact' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
    },
    reporterName: {
      name: 'reporterName',
      label: { id: 'Nama Pelapor', en: 'Reporter Name' },
      type: 'text',
      searchable: true,
    },
    reporterEmail: {
      name: 'reporterEmail',
      label: { id: 'Email Pelapor', en: 'Reporter Email' },
      type: 'email',
      searchable: true,
    },
    teamId: {
      name: 'teamId',
      label: { id: 'Tim', en: 'Team' },
      type: 'many2one',
      target: 'hd.team',
      widget: 'reference',
    },
    assigneeId: {
      name: 'assigneeId',
      label: { id: 'Penerima Tugas', en: 'Assignee' },
      type: 'many2one',
      target: 'platform.user',
      widget: 'avatar-select',
    },
    slaPolicyId: {
      name: 'slaPolicyId',
      label: { id: 'Kebijakan SLA', en: 'SLA Policy' },
      type: 'many2one',
      target: 'hd.sla_policy',
      readonly: true,
      help: 'Dipilih otomatis saat tiket dibuat berdasarkan kondisi SLA yang cocok.',
      tooltip: 'SLA yang berlaku untuk tiket ini.',
    },
    slaDueAt: {
      name: 'slaDueAt',
      label: { id: 'Tenggat SLA', en: 'SLA Due' },
      type: 'datetime',
      readonly: true,
    },
    responseTimeMinutes: {
      name: 'responseTimeMinutes',
      label: { id: 'Waktu Respons (menit)', en: 'Response Time (min)' },
      type: 'computed',
      readonly: true,
      compute: {
        mode: 'function',
        fn: 'hd.computeResponseTime',
        deps: ['firstReplyAt', 'createdAt'],
        store: true,
      },
      help: 'Selisih antara createdAt dan firstReplyAt dalam menit. Disimpan saat firstReplyAt pertama kali diisi.',
      tooltip: 'Berapa menit hingga agen pertama kali membalas.',
    },
    aiSummary: {
      name: 'aiSummary',
      label: { id: 'Ringkasan AI', en: 'AI Summary' },
      type: 'ai-field',
      widget: 'textarea',
      ai: {
        prompt:
          'Ringkas tiket ini dalam 2–3 kalimat Bahasa Indonesia. ' +
          'Sebutkan masalah utama, prioritas, dan status saat ini.',
        inputFields: ['subject', 'status', 'priority', 'reporterName'],
        model: 'haiku',
        trigger: 'on_create',
        store: true,
      },
      tooltip: 'Ringkasan singkat yang dibuat oleh AI saat tiket pertama kali disimpan.',
    },
    firstReplyAt: {
      name: 'firstReplyAt',
      label: { id: 'Balasan Pertama', en: 'First Reply At' },
      type: 'datetime',
      readonly: true,
    },
    resolvedAt: {
      name: 'resolvedAt',
      label: { id: 'Diselesaikan Pada', en: 'Resolved At' },
      type: 'datetime',
      readonly: true,
    },
    closedAt: {
      name: 'closedAt',
      label: { id: 'Ditutup Pada', en: 'Closed At' },
      type: 'datetime',
      readonly: true,
    },
    createdAt: {
      name: 'createdAt',
      label: { id: 'Dibuat Pada', en: 'Created At' },
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
          label: { id: 'Pelapor', en: 'Reporter' },
          rows: [
            ['contactId', 'reporterName'],
            'reporterEmail',
          ],
        },
        {
          id: 'assignment',
          label: { id: 'Penugasan', en: 'Assignment' },
          rows: [
            ['teamId', 'assigneeId'],
            ['slaPolicyId', 'slaDueAt'],
          ],
        },
        {
          id: 'ai',
          label: { id: 'AI', en: 'AI' },
          rows: [
            'aiSummary',
          ],
        },
        {
          id: 'timeline',
          label: { id: 'Linimasa', en: 'Timeline' },
          rows: [
            ['firstReplyAt', 'responseTimeMinutes'],
            ['resolvedAt', 'closedAt'],
            'createdAt',
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
