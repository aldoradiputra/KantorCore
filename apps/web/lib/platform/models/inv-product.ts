import type { ModelMeta } from './types'

export const invProductModel: ModelMeta = {
  entity: 'inv.product',
  module: 'IS-INV',
  label:       { id: 'Produk', en: 'Product' },
  pluralLabel: { id: 'Produk', en: 'Products' },
  displayField: 'name',
  help:
    'Master data produk yang dapat dibeli/dijual. Tipe \"product\" dilacak stok-nya via stock_moves + stock_quants. ' +
    '\"service\" tidak punya stok (jasa). \"consumable\" fisik tapi tidak dilacak. ' +
    'Mengarahkan ke revenue/expense account default + pajak default untuk auto-fill di SO/PO lines.',

  fields: {
    code: {
      name: 'code',
      label: { id: 'Kode/SKU', en: 'Code / SKU' },
      type: 'text',
      searchable: true,
      help: 'SKU atau kode produk. Unik per tenant bila diisi.',
      tooltip: 'Kode unik produk.',
    },
    name: {
      name: 'name',
      label: { id: 'Nama Produk', en: 'Product Name' },
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
    type: {
      name: 'type',
      label: { id: 'Tipe', en: 'Type' },
      type: 'enum',
      required: true,
      default: 'product',
      options: [
        { value: 'product',    label: { id: 'Stockable',  en: 'Stockable' } },
        { value: 'service',    label: { id: 'Jasa',       en: 'Service' } },
        { value: 'consumable', label: { id: 'Consumable', en: 'Consumable' } },
      ],
      help: 'Hanya tipe \"product\" yang dilacak stok-nya di stock_quants.',
    },
    categoryId: {
      name: 'categoryId',
      label: { id: 'Kategori', en: 'Category' },
      type: 'many2one',
      target: 'inv.product_category',
    },
    uomId: {
      name: 'uomId',
      label: { id: 'Satuan', en: 'Unit of Measure' },
      type: 'many2one',
      target: 'inv.uom',
      help: 'Satuan ukur — pcs, kg, liter, dll.',
    },
    salePrice: {
      name: 'salePrice',
      label: { id: 'Harga Jual', en: 'Sale Price' },
      type: 'monetary',
      currency: 'IDR',
      default: 0,
      help: 'Harga jual default (IDR, tanpa desimal). Diisikan otomatis ke SO line.',
    },
    costPrice: {
      name: 'costPrice',
      label: { id: 'Harga Pokok', en: 'Cost Price' },
      type: 'monetary',
      currency: 'IDR',
      default: 0,
      help: 'Harga beli/HPP default. Diisikan otomatis ke PO line.',
    },
    revenueAccountId: {
      name: 'revenueAccountId',
      label: { id: 'Akun Pendapatan', en: 'Revenue Account' },
      type: 'many2one',
      target: 'fin.account',
      help: 'Akun pendapatan default saat produk dijual (untuk journal entry SO/invoice).',
    },
    expenseAccountId: {
      name: 'expenseAccountId',
      label: { id: 'Akun Beban', en: 'Expense Account' },
      type: 'many2one',
      target: 'fin.account',
      help: 'Akun beban/aset default saat produk dibeli.',
    },
    defaultSaleTaxIds: {
      name: 'defaultSaleTaxIds',
      label: { id: 'Pajak Penjualan Default', en: 'Default Sale Taxes' },
      type: 'tags',
      help: 'Array tax IDs (sebagai string) yang otomatis diterapkan ke SO line.',
    },
    defaultPurchaseTaxIds: {
      name: 'defaultPurchaseTaxIds',
      label: { id: 'Pajak Pembelian Default', en: 'Default Purchase Taxes' },
      type: 'tags',
      help: 'Array tax IDs untuk PO line.',
    },
    isActive: {
      name: 'isActive',
      label: { id: 'Aktif', en: 'Active' },
      type: 'boolean',
      default: true,
      help: 'Bila false, produk tersembunyi dari picker SO/PO/inventory.',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
    },
    onHandQty: {
      name: 'onHandQty',
      label: { id: 'Stok Tersedia', en: 'On-Hand Qty' },
      type: 'computed',
      readonly: true,
      compute: {
        mode: 'function',
        fn: 'inventory.computeOnHand',
        deps: ['id'],
        store: false,
      },
      help: 'Total stok di semua lokasi internal. Dihitung dari stock_quants.',
      tooltip: 'Total stok saat ini.',
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
      columns: ['code', 'name', 'type', 'salePrice', 'costPrice', 'onHandQty', 'isActive'],
      defaultSort: { field: 'name', direction: 'asc' },
      filters: ['type', 'categoryId', 'isActive'],
    },
    form: {
      rows: [
        'name',
        ['code', 'type'],
        ['categoryId', 'uomId'],
      ],
      tabs: [
        {
          id: 'pricing',
          label: { id: 'Harga', en: 'Pricing' },
          rows: [
            ['salePrice', 'costPrice'],
            ['revenueAccountId', 'expenseAccountId'],
            ['defaultSaleTaxIds', 'defaultPurchaseTaxIds'],
          ],
        },
        {
          id: 'inventory',
          label: { id: 'Inventaris', en: 'Inventory' },
          rows: [
            ['onHandQty', 'isActive'],
          ],
        },
        {
          id: 'description',
          label: { id: 'Deskripsi', en: 'Description' },
          rows: ['description', 'notes'],
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
}
