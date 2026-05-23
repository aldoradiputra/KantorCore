import type { ImportEntity } from '@kantorcore/db'

export type { ImportEntity }

export interface ColSpec { key: string; label: string; required: boolean; hint?: string }

export const ENTITY_COLUMNS: Record<ImportEntity, ColSpec[]> = {
  contacts: [
    { key: 'name',    label: 'Nama',   required: true  },
    { key: 'email',   label: 'Email',  required: false },
    { key: 'phone',   label: 'Telepon', required: false },
    { key: 'npwp',    label: 'NPWP',   required: false },
    { key: 'address', label: 'Alamat', required: false },
    { key: 'roles',   label: 'Peran',  required: false, hint: 'customer / vendor / staff / lead / other (pisah koma)' },
  ],
  vendors: [
    { key: 'name',    label: 'Nama Vendor', required: true  },
    { key: 'email',   label: 'Email',       required: false },
    { key: 'phone',   label: 'Telepon',     required: false },
    { key: 'npwp',    label: 'NPWP',        required: false },
    { key: 'address', label: 'Alamat',      required: false },
  ],
  products: [
    { key: 'name',      label: 'Nama Produk', required: true  },
    { key: 'code',      label: 'Kode',        required: false },
    { key: 'type',      label: 'Tipe',        required: false, hint: 'product / service / consumable' },
    { key: 'salePrice', label: 'Harga Jual',  required: false, hint: 'angka IDR tanpa titik/koma' },
    { key: 'costPrice', label: 'Harga Beli',  required: false, hint: 'angka IDR tanpa titik/koma' },
    { key: 'notes',     label: 'Catatan',     required: false },
  ],
  accounts: [
    { key: 'code', label: 'Kode Akun',  required: true  },
    { key: 'name', label: 'Nama Akun',  required: true  },
    { key: 'type', label: 'Tipe',       required: true,  hint: 'asset / liability / equity / revenue / expense' },
  ],
}

export const ENTITY_LABEL: Record<ImportEntity, string> = {
  contacts: 'Kontak',
  vendors:  'Vendor',
  products: 'Produk',
  accounts: 'Akun Keuangan',
}
