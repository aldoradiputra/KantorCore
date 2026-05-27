import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { importJobs, type ImportJob, type ImportEntity } from '@kantorcore/db'
import { withTenant } from './db'
import { createContact } from './contacts'
import { createProduct } from './products'

export type { ImportJob, ImportEntity }

// ── Column specs per entity ───────────────────────────────────────────────────

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

// ── List jobs ─────────────────────────────────────────────────────────────────

export async function listImportJobs(tenantId: string): Promise<ImportJob[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(importJobs)
      .where(eq(importJobs.tenantId, tenantId))
      .orderBy(desc(importJobs.createdAt))
      .limit(50),
  )
}

// ── Run import ────────────────────────────────────────────────────────────────

export interface ImportRow { [key: string]: string }

export interface ImportResult {
  ok: boolean
  jobId: string
  totalRows: number
  imported: number
  failed: number
  errors: { row: number; message: string }[]
}

export async function runImport(input: {
  tenantId: string
  userId: string
  entity: ImportEntity
  rows: ImportRow[]
}): Promise<ImportResult> {
  const { tenantId, userId, entity, rows } = input

  // Create job record
  const [job] = await withTenant(tenantId, (tx) =>
    tx.insert(importJobs)
      .values({ tenantId, entity, status: 'pending', totalRows: rows.length, createdBy: userId })
      .returning(),
  )

  const errors: { row: number; message: string }[] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    try {
      await importRow(tenantId, entity, row)
      imported++
    } catch (e: any) {
      errors.push({ row: i + 1, message: e?.message ?? 'Error tidak diketahui' })
    }
  }

  const status = errors.length === rows.length ? 'failed' : 'done'
  await withTenant(tenantId, (tx) =>
    tx.update(importJobs)
      .set({ status, imported, failed: errors.length, errors })
      .where(eq(importJobs.id, job!.id)),
  )

  return { ok: status !== 'failed', jobId: job!.id, totalRows: rows.length, imported, failed: errors.length, errors }
}

async function importRow(tenantId: string, entity: ImportEntity, row: ImportRow): Promise<void> {
  if (entity === 'contacts' || entity === 'vendors') {
    const roles = entity === 'vendors'
      ? ['vendor' as const]
      : (row.roles ?? '')
          .split(',')
          .map((r) => r.trim().toLowerCase())
          .filter((r): r is 'customer' | 'vendor' | 'staff' | 'lead' | 'other' =>
            ['customer', 'vendor', 'staff', 'lead', 'other'].includes(r),
          )
    const result = await createContact(tenantId, {
      type:    'company',
      name:    row.name ?? '',
      email:   row.email || null,
      phone:   row.phone || null,
      npwp:    row.npwp || null,
      address: row.address || null,
      roles:   roles.length > 0 ? roles : ['customer'],
    })
    if (!result.ok) throw new Error(result.error)
  }

  if (entity === 'products') {
    const typeVal = row.type?.toLowerCase()
    const type = ['product', 'service', 'consumable'].includes(typeVal ?? '')
      ? (typeVal as 'product' | 'service' | 'consumable')
      : 'product'
    const result = await createProduct(tenantId, {
      name:      row.name ?? '',
      code:      row.code || null,
      type,
      salePrice: parseInt(row.salePrice?.replace(/\D/g, '') || '0', 10),
      costPrice: parseInt(row.costPrice?.replace(/\D/g, '') || '0', 10),
      notes:     row.notes || null,
    })
    if (!result.ok) throw new Error(result.error)
  }

  if (entity === 'accounts') {
    // Accounts need to be inserted directly; use withTenant + drizzle
    const { accounts } = await import('@kantorcore/db')
    const { and, eq } = await import('drizzle-orm')
    const typeVal = row.type?.toLowerCase()
    const validTypes = ['asset','liability','equity','revenue','expense']
    if (!validTypes.includes(typeVal ?? '')) throw new Error(`Tipe akun tidak valid: ${row.type}`)
    if (!row.code?.trim()) throw new Error('Kode akun wajib diisi.')
    if (!row.name?.trim()) throw new Error('Nama akun wajib diisi.')

    await withTenant(tenantId, async (tx) => {
      const conflict = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, row.code.trim())))
        .limit(1)
      if (conflict.length > 0) throw new Error(`Kode akun ${row.code} sudah ada.`)
      await tx.insert(accounts).values({
        tenantId,
        code: row.code.trim(),
        name: row.name.trim(),
        type: typeVal as any,
      })
    })
  }
}
