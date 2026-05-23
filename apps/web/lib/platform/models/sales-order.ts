import type { ModelMeta } from './types'

export const salesOrderModel: ModelMeta = {
  entity: 'sales.order',
  module: 'IS-SALES',
  label:       { id: 'Pesanan Penjualan', en: 'Sales Order' },
  pluralLabel: { id: 'Pesanan Penjualan', en: 'Sales Orders' },
  displayField: 'soNumber',
  help:
    'Pesanan penjualan dari pelanggan. Diawali sebagai quotation, dikonfirmasi menjadi sales order, ' +
    'kemudian \"done\" setelah semua line item terkirim. ' +
    'Setelah dikonfirmasi, dapat menghasilkan fin.invoice (lewat createInvoiceFromSO) dan ' +
    'inv.stock_move (untuk pengiriman barang dari gudang ke pelanggan).',

  fields: {
    soNumber: {
      name: 'soNumber',
      label: { id: 'Nomor Pesanan', en: 'Order Number' },
      type: 'text',
      required: true,
      readonly: true,
      searchable: true,
      tooltip: 'Nomor unik pesanan.',
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'quotation',
      widget: 'badge',
      options: [
        { value: 'quotation', label: { id: 'Penawaran',    en: 'Quotation' } },
        { value: 'confirmed', label: { id: 'Dikonfirmasi', en: 'Confirmed' } },
        { value: 'done',      label: { id: 'Selesai',      en: 'Done' } },
        { value: 'cancelled', label: { id: 'Dibatalkan',   en: 'Cancelled' } },
      ],
      help: 'Quotation → editable, belum komitmen. Confirmed → siap dikirim & ditagih. Done → semua line terkirim.',
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Pelanggan', en: 'Customer' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
    },
    customerName: {
      name: 'customerName',
      label: { id: 'Nama Pelanggan', en: 'Customer Name' },
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
    expiryDate: {
      name: 'expiryDate',
      label: { id: 'Berlaku Hingga', en: 'Expiry Date' },
      type: 'date',
      help: 'Untuk quotation: tanggal kadaluarsa penawaran.',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
    },
    invoiceId: {
      name: 'invoiceId',
      label: { id: 'Faktur', en: 'Invoice' },
      type: 'many2one',
      target: 'fin.invoice',
      readonly: true,
      help: 'Diisi otomatis saat invoice dibuat dari SO ini.',
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
      columns: ['soNumber', 'customerName', 'status', 'date', 'expiryDate'],
      defaultSort: { field: 'date', direction: 'desc' },
      filters: ['status', 'contactId'],
    },
    form: {
      rows: [
        'soNumber',
        ['status', 'date', 'expiryDate'],
      ],
      tabs: [
        {
          id: 'customer',
          label: { id: 'Pelanggan', en: 'Customer' },
          rows: [['contactId', 'customerName']],
        },
        {
          id: 'links',
          label: { id: 'Tautan', en: 'Links' },
          rows: [['invoiceId', 'createdBy']],
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
      cardTitle: 'soNumber',
      cardFields: ['customerName', 'date'],
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
