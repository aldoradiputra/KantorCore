import type { ModelMeta } from './types'

export const emailAccountModel: ModelMeta = {
  entity: 'email.account',
  module: 'IS-EMAIL',
  label:       { id: 'Akun Email', en: 'Email Account' },
  pluralLabel: { id: 'Akun Email', en: 'Email Accounts' },
  displayField: 'address',
  help:
    'Inbox bersama (shared inbox) — kredensial IMAP+SMTP untuk satu alamat email tim. ' +
    'Worker IMAP sync menarik pesan baru ke email.thread + email.message. ' +
    'Password disimpan terenkripsi. Satu alamat unik per tenant.',

  fields: {
    label: {
      name: 'label',
      label: { id: 'Label', en: 'Label' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Nama tampilan akun (mis. \"Support\", \"Sales\"). Tidak harus unik.',
    },
    address: {
      name: 'address',
      label: { id: 'Alamat Email', en: 'Email Address' },
      type: 'email',
      required: true,
      searchable: true,
      tooltip: 'Alamat email lengkap.',
    },
    imapHost: {
      name: 'imapHost',
      label: { id: 'IMAP Host', en: 'IMAP Host' },
      type: 'text',
      required: true,
    },
    imapPort: {
      name: 'imapPort',
      label: { id: 'IMAP Port', en: 'IMAP Port' },
      type: 'integer',
      required: true,
      default: 993,
    },
    imapSecure: {
      name: 'imapSecure',
      label: { id: 'IMAP TLS', en: 'IMAP TLS' },
      type: 'boolean',
      default: true,
    },
    imapUser: {
      name: 'imapUser',
      label: { id: 'IMAP User', en: 'IMAP User' },
      type: 'text',
      required: true,
    },
    imapPassword: {
      name: 'imapPassword',
      label: { id: 'IMAP Password', en: 'IMAP Password' },
      type: 'text',
      required: true,
      help: 'Disimpan terenkripsi. Hanya boleh diakses worker IMAP sync.',
      tooltip: 'Password IMAP (terenkripsi).',
    },
    smtpHost: {
      name: 'smtpHost',
      label: { id: 'SMTP Host', en: 'SMTP Host' },
      type: 'text',
      required: true,
    },
    smtpPort: {
      name: 'smtpPort',
      label: { id: 'SMTP Port', en: 'SMTP Port' },
      type: 'integer',
      required: true,
      default: 465,
    },
    smtpSecure: {
      name: 'smtpSecure',
      label: { id: 'SMTP TLS', en: 'SMTP TLS' },
      type: 'boolean',
      default: true,
    },
    smtpUser: {
      name: 'smtpUser',
      label: { id: 'SMTP User', en: 'SMTP User' },
      type: 'text',
      required: true,
    },
    smtpPassword: {
      name: 'smtpPassword',
      label: { id: 'SMTP Password', en: 'SMTP Password' },
      type: 'text',
      required: true,
    },
    active: {
      name: 'active',
      label: { id: 'Aktif', en: 'Active' },
      type: 'boolean',
      default: true,
      help: 'Bila false, worker IMAP berhenti sync untuk akun ini.',
    },
    lastSyncAt: {
      name: 'lastSyncAt',
      label: { id: 'Sync Terakhir', en: 'Last Sync At' },
      type: 'datetime',
      readonly: true,
    },
    lastSyncError: {
      name: 'lastSyncError',
      label: { id: 'Error Sync Terakhir', en: 'Last Sync Error' },
      type: 'longtext',
      widget: 'textarea',
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
      columns: ['label', 'address', 'active', 'lastSyncAt'],
      defaultSort: { field: 'label', direction: 'asc' },
      filters: ['active'],
    },
    form: {
      rows: [
        ['label', 'address'],
        ['active'],
      ],
      tabs: [
        {
          id: 'imap',
          label: { id: 'IMAP', en: 'IMAP' },
          rows: [
            ['imapHost', 'imapPort'],
            ['imapUser', 'imapPassword'],
            'imapSecure',
          ],
        },
        {
          id: 'smtp',
          label: { id: 'SMTP', en: 'SMTP' },
          rows: [
            ['smtpHost', 'smtpPort'],
            ['smtpUser', 'smtpPassword'],
            'smtpSecure',
          ],
        },
        {
          id: 'status',
          label: { id: 'Status Sync', en: 'Sync Status' },
          rows: [
            'lastSyncAt',
            'lastSyncError',
          ],
        },
      ],
    },
  },

  perms: {
    create: ['admin'],
    read:   ['admin', 'agent'],
    update: ['admin'],
    delete: ['admin'],
  },
}
