import type { ModelMeta } from './types'

export const crmDealModel: ModelMeta = {
  entity: 'crm.deal',
  module: 'IS-CRM',
  label:       { id: 'Peluang',  en: 'Deal' },
  pluralLabel: { id: 'Peluang',  en: 'Deals' },
  displayField: 'title',
  help:
    'Peluang penjualan (sales opportunity) yang dikelola oleh tim CRM. ' +
    'Setiap deal melewati pipeline tahap (lead → qualified → proposal → negotiation → won/lost) ' +
    'dan dapat dikonversi menjadi sales.order saat status menjadi won. ' +
    'Terhubung ke crm.contact untuk pelanggan dan platform.user untuk owner/assignee.',

  fields: {
    dealNumber: {
      name: 'dealNumber',
      label: { id: 'Nomor Peluang', en: 'Deal Number' },
      type: 'text',
      readonly: true,
      searchable: true,
      help: 'Nomor referensi peluang. Dibuat otomatis (mis. DEAL-2026-001) saat record disimpan.',
      tooltip: 'Nomor unik peluang.',
    },
    title: {
      name: 'title',
      label: { id: 'Judul', en: 'Title' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Judul singkat peluang. Tampil sebagai display label di list/kanban.',
    },
    stage: {
      name: 'stage',
      label: { id: 'Tahap', en: 'Stage' },
      type: 'enum',
      required: true,
      default: 'lead',
      widget: 'badge',
      options: [
        { value: 'lead',        label: { id: 'Lead',       en: 'Lead' } },
        { value: 'qualified',   label: { id: 'Tervalidasi',en: 'Qualified' } },
        { value: 'proposal',    label: { id: 'Proposal',   en: 'Proposal' } },
        { value: 'negotiation', label: { id: 'Negosiasi',  en: 'Negotiation' } },
        { value: 'won',         label: { id: 'Menang',     en: 'Won' } },
        { value: 'lost',        label: { id: 'Kalah',      en: 'Lost' } },
      ],
      help: 'Tahap pipeline saat ini. Setelah \"won\", deal biasanya dikonversi menjadi sales.order.',
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Kontak', en: 'Contact' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
      help: 'Pelanggan/lead yang terkait dengan peluang ini.',
    },
    contactName: {
      name: 'contactName',
      label: { id: 'Nama Kontak', en: 'Contact Name' },
      type: 'text',
      searchable: true,
      help: 'Snapshot nama kontak pada saat deal dibuat — untuk peluang anonim atau lead yang belum jadi contact.',
    },
    expectedValue: {
      name: 'expectedValue',
      label: { id: 'Nilai Estimasi', en: 'Expected Value' },
      type: 'monetary',
      currency: 'IDR',
      default: 0,
      help: 'Estimasi nilai transaksi dalam IDR (tanpa desimal). Digunakan untuk forecasting pipeline.',
    },
    expectedClose: {
      name: 'expectedClose',
      label: { id: 'Perkiraan Tutup', en: 'Expected Close' },
      type: 'date',
      help: 'Perkiraan tanggal deal akan ditutup (won atau lost).',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
      searchable: true,
    },
    soId: {
      name: 'soId',
      label: { id: 'Sales Order', en: 'Sales Order' },
      type: 'many2one',
      target: 'sales.order',
      readonly: true,
      help: 'Diisi otomatis saat deal dikonversi menjadi sales order.',
    },
    assignedTo: {
      name: 'assignedTo',
      label: { id: 'Penerima Tugas', en: 'Assigned To' },
      type: 'many2one',
      target: 'platform.user',
      widget: 'avatar-select',
    },
    createdBy: {
      name: 'createdBy',
      label: { id: 'Dibuat Oleh', en: 'Created By' },
      type: 'many2one',
      target: 'platform.user',
      readonly: true,
    },
    aiNextAction: {
      name: 'aiNextAction',
      label: { id: 'Saran Tindakan AI', en: 'AI Next Action' },
      type: 'ai-field',
      widget: 'textarea',
      ai: {
        prompt:
          'Berdasarkan tahap, nilai, dan catatan deal, sarankan satu tindakan berikutnya ' +
          'yang konkret (maks 1 kalimat Bahasa Indonesia) untuk sales rep.',
        inputFields: ['title', 'stage', 'expectedValue', 'expectedClose', 'notes'],
        model: 'haiku',
        trigger: 'on_change',
        store: true,
      },
      tooltip: 'Saran AI tentang langkah berikutnya untuk memenangkan deal ini.',
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
      columns: ['dealNumber', 'title', 'stage', 'expectedValue', 'expectedClose', 'assignedTo'],
      defaultSort: { field: 'updatedAt', direction: 'desc' },
      filters: ['stage', 'assignedTo'],
    },
    form: {
      rows: [
        'title',
        ['stage', 'expectedValue'],
      ],
      tabs: [
        {
          id: 'customer',
          label: { id: 'Pelanggan', en: 'Customer' },
          rows: [
            ['contactId', 'contactName'],
            'expectedClose',
          ],
        },
        {
          id: 'assignment',
          label: { id: 'Penugasan', en: 'Assignment' },
          rows: [
            ['assignedTo', 'createdBy'],
          ],
        },
        {
          id: 'notes',
          label: { id: 'Catatan', en: 'Notes' },
          rows: ['notes'],
        },
        {
          id: 'ai',
          label: { id: 'AI', en: 'AI' },
          rows: ['aiNextAction'],
        },
      ],
    },
    kanban: {
      groupBy: 'stage',
      cardTitle: 'title',
      cardFields: ['contactName', 'expectedValue', 'assignedTo'],
    },
  },

  perms: {
    create: ['admin', 'member', 'agent'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin', 'member', 'agent'],
    delete: ['admin'],
  },

  chatter: true,
  activities: true,
}
