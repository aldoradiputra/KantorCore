import type { ModelMeta } from './types'

export const crmContactModel: ModelMeta = {
  entity: 'crm.contact',
  module: 'IS-CRM',
  label:       { id: 'Kontak',   en: 'Contact' },
  pluralLabel: { id: 'Kontak',   en: 'Contacts' },
  displayField: 'name',
  help:
    'Golden record untuk setiap orang atau organisasi yang berinteraksi dengan workspace — ' +
    'pelanggan, vendor, staf internal, lead, atau konsultan eksternal. ' +
    'Email unik per tenant. Kontak dapat memiliki banyak peran (customer + vendor) via contact_roles. ' +
    'Direferensikan oleh invoices, bills, sales orders, dan deals.',

  fields: {
    type: {
      name: 'type',
      label: { id: 'Tipe', en: 'Type' },
      type: 'enum',
      required: true,
      default: 'person',
      options: [
        { value: 'person',       label: { id: 'Perorangan',  en: 'Person' } },
        { value: 'organization', label: { id: 'Organisasi',  en: 'Organization' } },
      ],
      help: 'Apakah kontak ini orang perorangan atau badan/organisasi (PT, CV, yayasan).',
    },
    name: {
      name: 'name',
      label: { id: 'Nama', en: 'Name' },
      type: 'text',
      required: true,
      searchable: true,
    },
    email: {
      name: 'email',
      label: { id: 'Email', en: 'Email' },
      type: 'email',
      searchable: true,
      help: 'Email unik per tenant. Digunakan untuk portal login dan pencocokan kontak otomatis dari email masuk.',
    },
    phone: {
      name: 'phone',
      label: { id: 'Telepon', en: 'Phone' },
      type: 'phone',
      searchable: true,
    },
    npwp: {
      name: 'npwp',
      label: { id: 'NPWP', en: 'NPWP' },
      type: 'text',
      searchable: true,
      help: 'Nomor Pokok Wajib Pajak Indonesia. Format 15 digit (12.345.678.9-012.000). Validasi di application layer.',
      tooltip: 'Nomor pajak Indonesia.',
    },
    address: {
      name: 'address',
      label: { id: 'Alamat', en: 'Address' },
      type: 'longtext',
      widget: 'textarea',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
    },
    userId: {
      name: 'userId',
      label: { id: 'Pengguna Terkait', en: 'Linked User' },
      type: 'many2one',
      target: 'platform.user',
      help: 'Tautan ke akun login bila kontak ini adalah staf internal. NULL untuk kontak eksternal.',
    },
    portalEnabled: {
      name: 'portalEnabled',
      label: { id: 'Akses Portal', en: 'Portal Access' },
      type: 'boolean',
      default: false,
      help: 'Bila true, kontak dapat login ke portal eksternal lewat magic link.',
    },
    portalLastLogin: {
      name: 'portalLastLogin',
      label: { id: 'Login Portal Terakhir', en: 'Portal Last Login' },
      type: 'datetime',
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
      columns: ['name', 'type', 'email', 'phone', 'npwp'],
      defaultSort: { field: 'name', direction: 'asc' },
      filters: ['type', 'portalEnabled'],
    },
    form: {
      rows: [
        'name',
        ['type', 'email'],
        ['phone', 'npwp'],
      ],
      tabs: [
        {
          id: 'address',
          label: { id: 'Alamat', en: 'Address' },
          rows: ['address'],
        },
        {
          id: 'portal',
          label: { id: 'Portal', en: 'Portal' },
          rows: [
            ['userId', 'portalEnabled'],
            'portalLastLogin',
          ],
        },
        {
          id: 'notes',
          label: { id: 'Catatan', en: 'Notes' },
          rows: ['notes'],
        },
      ],
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
