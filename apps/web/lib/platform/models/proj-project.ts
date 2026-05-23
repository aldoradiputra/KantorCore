import type { ModelMeta } from './types'

export const projProjectModel: ModelMeta = {
  entity: 'proj.project',
  module: 'IS-PROJ',
  label:       { id: 'Proyek', en: 'Project' },
  pluralLabel: { id: 'Proyek', en: 'Projects' },
  displayField: 'name',
  help:
    'Proyek Linear-style. Memiliki short key (mis. \"KAN\") yang digabung dengan nomor issue ' +
    'untuk membentuk ID publik (KAN-42). Slug dan key keduanya unik per tenant. ' +
    'Container untuk proj.task (issues) dan target dari hr.timesheet_entry.projectId.',

  fields: {
    slug: {
      name: 'slug',
      label: { id: 'Slug', en: 'Slug' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Identifier URL-safe untuk proyek (huruf kecil, tanpa spasi). Unik per tenant.',
    },
    key: {
      name: 'key',
      label: { id: 'Kode', en: 'Key' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Prefix singkat (≤8 karakter) untuk issue ID, mis. \"KAN\" → KAN-1, KAN-2. Unik per tenant.',
      tooltip: 'Prefix issue (mis. KAN).',
    },
    name: {
      name: 'name',
      label: { id: 'Nama Proyek', en: 'Project Name' },
      type: 'text',
      required: true,
      searchable: true,
    },
    description: {
      name: 'description',
      label: { id: 'Deskripsi', en: 'Description' },
      type: 'longtext',
      widget: 'textarea',
      searchable: true,
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
  },

  views: {
    list: {
      columns: ['key', 'name', 'slug', 'createdBy', 'createdAt'],
      defaultSort: { field: 'createdAt', direction: 'desc' },
    },
    form: {
      rows: [
        'name',
        ['key', 'slug'],
        'description',
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
}
