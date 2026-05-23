import type { ModelMeta } from './types'

export const emailThreadModel: ModelMeta = {
  entity: 'email.thread',
  module: 'IS-EMAIL',
  label:       { id: 'Utas Email', en: 'Email Thread' },
  pluralLabel: { id: 'Utas Email', en: 'Email Threads' },
  displayField: 'subject',
  help:
    'Utas (thread) email yang dikelompokkan oleh subject + reference headers (In-Reply-To / References). ' +
    'Mengandung banyak email.message (inbound + outbound). ' +
    'Dapat di-assign ke user, di-snooze, atau ditutup. Auto-link ke crm.contact via pencocokan email address.',

  fields: {
    accountId: {
      name: 'accountId',
      label: { id: 'Akun', en: 'Account' },
      type: 'many2one',
      target: 'email.account',
      required: true,
      help: 'Inbox tempat thread ini diterima.',
    },
    subject: {
      name: 'subject',
      label: { id: 'Subjek', en: 'Subject' },
      type: 'text',
      searchable: true,
      help: 'Subjek dari pesan pertama thread. Nullable bila email tidak punya subject.',
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'open',
      widget: 'badge',
      options: [
        { value: 'open',    label: { id: 'Terbuka', en: 'Open' } },
        { value: 'snoozed', label: { id: 'Snooze',  en: 'Snoozed' } },
        { value: 'closed',  label: { id: 'Ditutup', en: 'Closed' } },
      ],
    },
    assignedTo: {
      name: 'assignedTo',
      label: { id: 'Ditangani Oleh', en: 'Assigned To' },
      type: 'many2one',
      target: 'platform.user',
      widget: 'avatar-select',
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Kontak', en: 'Contact' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
      help: 'Auto-resolve dari fromAddr email message pertama yang cocok dengan crm.contact.email.',
    },
    lastMessageAt: {
      name: 'lastMessageAt',
      label: { id: 'Pesan Terakhir', en: 'Last Message At' },
      type: 'datetime',
      readonly: true,
    },
    unreadCount: {
      name: 'unreadCount',
      label: { id: 'Jumlah Belum Dibaca', en: 'Unread Count' },
      type: 'integer',
      default: 0,
      readonly: true,
    },
    messageCount: {
      name: 'messageCount',
      label: { id: 'Jumlah Pesan', en: 'Message Count' },
      type: 'integer',
      default: 0,
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
      columns: ['subject', 'accountId', 'status', 'assignedTo', 'lastMessageAt', 'unreadCount'],
      defaultSort: { field: 'lastMessageAt', direction: 'desc' },
      filters: ['status', 'accountId', 'assignedTo'],
    },
    form: {
      rows: [
        'subject',
        ['status', 'assignedTo'],
      ],
      tabs: [
        {
          id: 'meta',
          label: { id: 'Meta', en: 'Meta' },
          rows: [
            ['accountId', 'contactId'],
            ['lastMessageAt', 'messageCount'],
            'unreadCount',
          ],
        },
      ],
    },
    kanban: {
      groupBy: 'status',
      cardTitle: 'subject',
      cardFields: ['assignedTo', 'lastMessageAt', 'unreadCount'],
    },
  },

  perms: {
    create: ['admin', 'member', 'agent'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin', 'member', 'agent'],
    delete: ['admin'],
  },

  chatter: false,
}
