import type { ModelMeta } from './types'

export const finBillModel: ModelMeta = {
  entity: 'fin.bill',
  module: 'IS-FIN',
  label:       { id: 'Tagihan Vendor', en: 'Vendor Bill' },
  pluralLabel: { id: 'Tagihan Vendor', en: 'Vendor Bills' },
  displayField: 'billNumber',
  help:
    'Tagihan vendor (AP — Accounts Payable) yang diterima dari supplier. ' +
    'Saat di-confirm, sistem otomatis posting journal entry: ' +
    'debit 5xxx/1xxx Beban/Aset + 1230 Uang Muka Pajak, kredit 2100 Utang Usaha. ' +
    'Bill dapat dibuat manual atau otomatis dari proc.order via createBillFromPO.',

  fields: {
    billNumber: {
      name: 'billNumber',
      label: { id: 'Nomor Tagihan', en: 'Bill Number' },
      type: 'text',
      required: true,
      readonly: true,
      searchable: true,
      help: 'Nomor referensi internal untuk tagihan. Dibuat otomatis saat record disimpan.',
      tooltip: 'Nomor unik tagihan vendor.',
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
        { value: 'paid',      label: { id: 'Lunas',        en: 'Paid' } },
        { value: 'cancelled', label: { id: 'Dibatalkan',   en: 'Cancelled' } },
      ],
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Vendor', en: 'Vendor' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
      help: 'FK ke platform.contacts (peran vendor). Nullable untuk backward compat.',
    },
    vendorName: {
      name: 'vendorName',
      label: { id: 'Nama Vendor', en: 'Vendor Name' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Snapshot nama vendor pada saat tagihan dibuat.',
    },
    vendorRef: {
      name: 'vendorRef',
      label: { id: 'Ref Vendor', en: 'Vendor Reference' },
      type: 'text',
      searchable: true,
      help: 'Nomor invoice asli dari vendor (mis. INV-VND-001/2026). Untuk rekonsiliasi.',
    },
    date: {
      name: 'date',
      label: { id: 'Tanggal Tagihan', en: 'Bill Date' },
      type: 'date',
      required: true,
    },
    dueDate: {
      name: 'dueDate',
      label: { id: 'Jatuh Tempo', en: 'Due Date' },
      type: 'date',
      required: true,
      help: 'Batas pembayaran ke vendor. Bill dengan dueDate < hari ini dianggap overdue.',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
    },
    displayTaxInline: {
      name: 'displayTaxInline',
      label: { id: 'Tampilkan Pajak Inline', en: 'Display Tax Inline' },
      type: 'boolean',
      default: false,
    },
    journalEntryId: {
      name: 'journalEntryId',
      label: { id: 'Journal Entry', en: 'Journal Entry' },
      type: 'many2one',
      target: 'fin.journal_entry',
      readonly: true,
      help: 'Diisi otomatis saat bill di-confirm.',
    },
    total: {
      name: 'total',
      label: { id: 'Total', en: 'Total' },
      type: 'computed',
      readonly: true,
      currency: 'IDR',
      compute: {
        mode: 'function',
        fn: 'finance.computeBillTotal',
        deps: ['lines'],
        store: false,
      },
      help: 'Total semua baris bill termasuk pajak.',
      tooltip: 'Total tagihan termasuk pajak.',
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
      columns: ['billNumber', 'vendorName', 'status', 'date', 'dueDate', 'total'],
      defaultSort: { field: 'date', direction: 'desc' },
      filters: ['status', 'contactId'],
    },
    form: {
      rows: [
        'billNumber',
        ['status', 'date', 'dueDate'],
      ],
      tabs: [
        {
          id: 'vendor',
          label: { id: 'Vendor', en: 'Vendor' },
          rows: [
            ['contactId', 'vendorName'],
            'vendorRef',
          ],
        },
        {
          id: 'accounting',
          label: { id: 'Akuntansi', en: 'Accounting' },
          rows: [
            ['displayTaxInline', 'journalEntryId'],
            'total',
          ],
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
      cardTitle: 'billNumber',
      cardFields: ['vendorName', 'total', 'dueDate'],
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
