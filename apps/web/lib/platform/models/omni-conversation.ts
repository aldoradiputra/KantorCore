import type { ModelMeta } from './types'

export const omniConversationModel: ModelMeta = {
  entity: 'omni.conversation',
  module: 'IS-OMNI',
  label:       { id: 'Percakapan', en: 'Conversation' },
  pluralLabel: { id: 'Percakapan', en: 'Conversations' },
  displayField: 'subject',
  help:
    'Percakapan omnichannel — sesi chat antara pelanggan (lewat omni.channel) dengan tim agent. ' +
    'Membungkus omni.message dua arah (inbound + outbound). ' +
    'Status: open → pending → resolved/snoozed. Dapat di-assign ke user dan ditautkan ke crm.contact.',

  fields: {
    channelId: {
      name: 'channelId',
      label: { id: 'Saluran', en: 'Channel' },
      type: 'many2one',
      target: 'omni.channel',
      required: true,
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Kontak', en: 'Contact' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
      help: 'Resolved bila contactIdentifier cocok dengan crm.contact (email/phone).',
    },
    contactName: {
      name: 'contactName',
      label: { id: 'Nama Kontak', en: 'Contact Name' },
      type: 'text',
      searchable: true,
      help: 'Nama yang dilaporkan saluran (mis. nama widget chat) bila contact belum diresolve.',
    },
    contactIdentifier: {
      name: 'contactIdentifier',
      label: { id: 'Identifier Kontak', en: 'Contact Identifier' },
      type: 'text',
      searchable: true,
      help: 'Identifier eksternal (nomor WA, email pengirim, session widget) untuk matching ke contact.',
    },
    subject: {
      name: 'subject',
      label: { id: 'Subjek', en: 'Subject' },
      type: 'text',
      searchable: true,
      help: 'Subjek/ringkasan singkat percakapan. Nullable — chat tidak selalu punya subjek.',
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'open',
      widget: 'badge',
      options: [
        { value: 'open',     label: { id: 'Terbuka',  en: 'Open' } },
        { value: 'pending',  label: { id: 'Menunggu', en: 'Pending' } },
        { value: 'resolved', label: { id: 'Selesai',  en: 'Resolved' } },
        { value: 'snoozed',  label: { id: 'Snooze',   en: 'Snoozed' } },
      ],
    },
    assignedTo: {
      name: 'assignedTo',
      label: { id: 'Ditangani Oleh', en: 'Assigned To' },
      type: 'many2one',
      target: 'platform.user',
      widget: 'avatar-select',
    },
    lastMessageAt: {
      name: 'lastMessageAt',
      label: { id: 'Pesan Terakhir', en: 'Last Message At' },
      type: 'datetime',
      readonly: true,
    },
    unreadCount: {
      name: 'unreadCount',
      label: { id: 'Belum Dibaca', en: 'Unread Count' },
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
    externalRef: {
      name: 'externalRef',
      label: { id: 'Ref Eksternal', en: 'External Reference' },
      type: 'text',
      readonly: true,
      help: 'Reference id provider eksternal (mis. waMessageId thread). Unik per channel untuk dedup.',
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
      columns: ['subject', 'contactName', 'channelId', 'status', 'assignedTo', 'lastMessageAt', 'unreadCount'],
      defaultSort: { field: 'lastMessageAt', direction: 'desc' },
      filters: ['status', 'channelId', 'assignedTo'],
    },
    form: {
      rows: [
        'subject',
        ['status', 'assignedTo'],
      ],
      tabs: [
        {
          id: 'customer',
          label: { id: 'Pelanggan', en: 'Customer' },
          rows: [
            ['contactId', 'contactName'],
            'contactIdentifier',
          ],
        },
        {
          id: 'meta',
          label: { id: 'Meta', en: 'Meta' },
          rows: [
            ['channelId', 'externalRef'],
            ['lastMessageAt', 'messageCount'],
            'unreadCount',
          ],
        },
      ],
    },
    kanban: {
      groupBy: 'status',
      cardTitle: 'subject',
      cardFields: ['contactName', 'channelId', 'assignedTo', 'lastMessageAt'],
    },
  },

  perms: {
    create: ['admin', 'member', 'agent', 'public'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin', 'member', 'agent'],
    delete: ['admin'],
  },
}
