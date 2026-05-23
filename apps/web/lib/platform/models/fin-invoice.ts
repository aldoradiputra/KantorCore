import type { ModelMeta } from './types'

export const finInvoiceModel: ModelMeta = {
  entity: 'fin.invoice',
  module: 'IS-FIN',
  label:       { id: 'Faktur Penjualan', en: 'Invoice' },
  pluralLabel: { id: 'Faktur Penjualan', en: 'Invoices' },
  displayField: 'invoiceNumber',
  help:
    'Faktur penjualan (AR — Accounts Receivable) yang dikirim ke pelanggan. ' +
    'Saat status berubah dari draft ke confirmed, sistem otomatis membuat journal entry double-entry: ' +
    'debit 1200 Piutang Usaha, kredit 4xxx Pendapatan + 2210 Utang Pajak. ' +
    'Status \"paid\" menandakan piutang sudah dilunasi (rekonsiliasi pembayaran).',

  fields: {
    invoiceNumber: {
      name: 'invoiceNumber',
      label: { id: 'Nomor Faktur', en: 'Invoice Number' },
      type: 'text',
      required: true,
      readonly: true,
      searchable: true,
      help: 'Nomor faktur unik per tenant. Dibuat otomatis saat invoice di-confirm.',
      tooltip: 'Nomor unik faktur.',
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
      help: 'Draf → editable. Confirmed → posting journal, faktur final. Paid → lunas. Cancelled → reversal journal dibuat.',
    },
    contactId: {
      name: 'contactId',
      label: { id: 'Pelanggan', en: 'Customer' },
      type: 'many2one',
      target: 'crm.contact',
      widget: 'reference',
      help: 'FK ke platform.contacts. Nullable untuk backward compat dengan invoice lama.',
    },
    customerName: {
      name: 'customerName',
      label: { id: 'Nama Pelanggan', en: 'Customer Name' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Snapshot nama pelanggan pada saat invoice dibuat. Tetap walaupun contact diubah.',
    },
    customerEmail: {
      name: 'customerEmail',
      label: { id: 'Email Pelanggan', en: 'Customer Email' },
      type: 'email',
      searchable: true,
    },
    date: {
      name: 'date',
      label: { id: 'Tanggal Faktur', en: 'Invoice Date' },
      type: 'date',
      required: true,
      help: 'Tanggal terbit faktur. Menentukan periode akuntansi journal entry.',
    },
    dueDate: {
      name: 'dueDate',
      label: { id: 'Jatuh Tempo', en: 'Due Date' },
      type: 'date',
      required: true,
      help: 'Batas pembayaran pelanggan. Faktur dengan dueDate < hari ini dianggap overdue.',
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
      help: 'Bila true, harga line item ditampilkan tax-inclusive di PDF/print.',
    },
    journalEntryId: {
      name: 'journalEntryId',
      label: { id: 'Journal Entry', en: 'Journal Entry' },
      type: 'many2one',
      target: 'fin.journal_entry',
      readonly: true,
      help: 'Diisi otomatis saat invoice di-confirm. Referensi jurnal pencatatan AR.',
    },
    total: {
      name: 'total',
      label: { id: 'Total', en: 'Total' },
      type: 'computed',
      readonly: true,
      currency: 'IDR',
      compute: {
        mode: 'function',
        fn: 'finance.computeInvoiceTotal',
        deps: ['lines'],
        store: false,
      },
      help: 'Total semua baris invoice termasuk pajak. Dihitung server-side dari invoice_lines + invoice_line_taxes.',
      tooltip: 'Total faktur termasuk pajak.',
    },
    aiSummary: {
      name: 'aiSummary',
      label: { id: 'Ringkasan AI', en: 'AI Summary' },
      type: 'ai-field',
      widget: 'textarea',
      ai: {
        prompt:
          'Ringkas faktur ini dalam 1–2 kalimat Bahasa Indonesia: untuk siapa, untuk apa, total, dan jatuh tempo.',
        inputFields: ['customerName', 'date', 'dueDate', 'notes'],
        model: 'haiku',
        trigger: 'on_create',
        store: true,
      },
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
      columns: ['invoiceNumber', 'customerName', 'status', 'date', 'dueDate', 'total'],
      defaultSort: { field: 'date', direction: 'desc' },
      filters: ['status', 'contactId'],
    },
    form: {
      rows: [
        'invoiceNumber',
        ['status', 'date', 'dueDate'],
      ],
      tabs: [
        {
          id: 'customer',
          label: { id: 'Pelanggan', en: 'Customer' },
          rows: [
            ['contactId', 'customerName'],
            'customerEmail',
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
          rows: ['notes', 'aiSummary'],
        },
      ],
    },
    kanban: {
      groupBy: 'status',
      cardTitle: 'invoiceNumber',
      cardFields: ['customerName', 'total', 'dueDate'],
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
