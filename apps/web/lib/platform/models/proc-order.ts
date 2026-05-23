import type { ModelMeta } from './types'

export const procOrderModel: ModelMeta = {
  entity: 'proc.order',
  module: 'IS-PROC',
  label:       { id: 'Pesanan Pembelian', en: 'Purchase Order' },
  pluralLabel: { id: 'Pesanan Pembelian', en: 'Purchase Orders' },
  displayField: 'poNumber',
  help:
    'Pesanan pembelian ke vendor. Alur: draft → confirmed → received → billed. ' +
    'Setelah confirmed, stock_moves dibuat saat barang diterima (received_qty diupdate). ' +
    'Status \"billed\" dicapai setelah createBillFromPO menghasilkan fin.bill yang terhubung.',

  fields: {
    poNumber: {
      name: 'poNumber',
      label: { id: 'Nomor PO', en: 'PO Number' },
      type: 'text',
      required: true,
      readonly: true,
      searchable: true,
      tooltip: 'Nomor unik pesanan pembelian.',
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'draft',
      widget: 'badge',
      options: [
        { value: 'draft',     label: { id: 'Draf',         en: 'Draft' } },
        { value: 'confirmed', label: { id: 'Dikonfirmasi', en: 'Confirmed' } },
        { value: 'received',  label: { id: 'Diterima',     en: 'Received' } },
        { value: 'billed',    label: { id: 'Ditagih',      en: 'Billed' } },
        { value: 'cancelled', label: { id: 'Dibatalkan',   en: 'Cancelled' } },
      ],
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Vendor', en: 'Vendor' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
    },
    vendorName: {
      name: 'vendorName',
      label: { id: 'Nama Vendor', en: 'Vendor Name' },
      type: 'text',
      required: true,
      searchable: true,
    },
    date: {
      name: 'date',
      label: { id: 'Tanggal', en: 'Date' },
      type: 'date',
      required: true,
    },
    expectedDate: {
      name: 'expectedDate',
      label: { id: 'Perkiraan Tiba', en: 'Expected Date' },
      type: 'date',
      help: 'Perkiraan tanggal barang tiba dari vendor.',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
    },
    billId: {
      name: 'billId',
      label: { id: 'Tagihan', en: 'Bill' },
      type: 'many2one',
      target: 'fin.bill',
      readonly: true,
      help: 'Diisi otomatis setelah createBillFromPO.',
    },
    createdBy: {
      name: 'createdBy',
      label: { id: 'Dibuat Oleh', en: 'Created By' },
      type: 'many2one',
      target: 'platform.user',
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
      columns: ['poNumber', 'vendorName', 'status', 'date', 'expectedDate'],
      defaultSort: { field: 'date', direction: 'desc' },
      filters: ['status', 'contactId'],
    },
    form: {
      rows: [
        'poNumber',
        ['status', 'date', 'expectedDate'],
      ],
      tabs: [
        {
          id: 'vendor',
          label: { id: 'Vendor', en: 'Vendor' },
          rows: [['contactId', 'vendorName']],
        },
        {
          id: 'links',
          label: { id: 'Tautan', en: 'Links' },
          rows: [['billId', 'createdBy']],
        },
        {
          id: 'notes',
          label: { id: 'Catatan', en: 'Notes' },
          rows: ['notes'],
        },
      ],
    },
    kanban: {
      groupBy: 'status',
      cardTitle: 'poNumber',
      cardFields: ['vendorName', 'date'],
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
