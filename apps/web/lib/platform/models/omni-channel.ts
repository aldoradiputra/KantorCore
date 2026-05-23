import type { ModelMeta } from './types'

export const omniChannelModel: ModelMeta = {
  entity: 'omni.channel',
  module: 'IS-OMNI',
  label:       { id: 'Saluran', en: 'Channel' },
  pluralLabel: { id: 'Saluran', en: 'Channels' },
  displayField: 'name',
  help:
    'Saluran omnichannel — titik masuk pesan pelanggan: web chat widget, email, WhatsApp Business API, atau SMS. ' +
    'Konfigurasi spesifik per tipe disimpan di kolom `config` (JSONB). ' +
    'Setiap channel menerima omni.conversation yang berisi omni.message dua arah.',

  fields: {
    name: {
      name: 'name',
      label: { id: 'Nama', en: 'Name' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Nama saluran (mis. \"Website Chat\", \"WA Customer Service\").',
    },
    type: {
      name: 'type',
      label: { id: 'Tipe', en: 'Type' },
      type: 'enum',
      required: true,
      options: [
        { value: 'email',    label: { id: 'Email',     en: 'Email' } },
        { value: 'web_chat', label: { id: 'Web Chat',  en: 'Web Chat' } },
        { value: 'whatsapp', label: { id: 'WhatsApp',  en: 'WhatsApp' } },
        { value: 'sms',      label: { id: 'SMS',       en: 'SMS' } },
      ],
      help:
        'Tipe saluran. Struktur `config` berbeda per tipe: ' +
        'web_chat={widgetColor,greeting,widgetToken}, email={emailAccountId}, ' +
        'whatsapp={phoneNumberId,accessToken,verifyToken}, sms={fromNumber,accountSid,authToken}.',
    },
    config: {
      name: 'config',
      label: { id: 'Konfigurasi', en: 'Configuration' },
      type: 'json',
      widget: 'json-editor',
      default: {},
      help: 'Object konfigurasi tipe-spesifik. Lihat type docs untuk skema per channel.',
    },
    active: {
      name: 'active',
      label: { id: 'Aktif', en: 'Active' },
      type: 'boolean',
      default: true,
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
      columns: ['name', 'type', 'active', 'createdAt'],
      defaultSort: { field: 'name', direction: 'asc' },
      filters: ['type', 'active'],
    },
    form: {
      rows: [
        'name',
        ['type', 'active'],
        'config',
      ],
    },
  },

  perms: {
    create: ['admin'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin'],
    delete: ['admin'],
  },
}
