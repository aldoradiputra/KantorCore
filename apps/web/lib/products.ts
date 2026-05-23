import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  products,
  productCategories,
  uom,
  type Product,
  type ProductCategory,
  type Uom,
  type ProductTypeValue,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { Product, ProductCategory, Uom, ProductTypeValue }

export interface ProductRow {
  product: Product
  categoryName: string | null
  uomSymbol: string | null
}

export async function listProducts(
  tenantId: string,
  opts: { search?: string; activeOnly?: boolean } = {},
): Promise<ProductRow[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(products.tenantId, tenantId)]
    if (opts.activeOnly !== false) conditions.push(eq(products.isActive, true))
    if (opts.search) {
      const q = `%${opts.search}%`
      conditions.push(
        or(ilike(products.name, q), ilike(products.code, q), ilike(products.description, q))!,
      )
    }

    const rows = await tx
      .select({
        product: products,
        categoryName: productCategories.name,
        uomSymbol: uom.symbol,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(uom, eq(products.uomId, uom.id))
      .where(and(...conditions))
      .orderBy(asc(products.name))

    return rows.map((r) => ({
      product: r.product,
      categoryName: r.categoryName ?? null,
      uomSymbol: r.uomSymbol ?? null,
    }))
  })
}

export async function getProduct(tenantId: string, id: string): Promise<ProductRow | null> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        product: products,
        categoryName: productCategories.name,
        uomSymbol: uom.symbol,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(uom, eq(products.uomId, uom.id))
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .limit(1)

    if (!row) return null
    return { product: row.product, categoryName: row.categoryName ?? null, uomSymbol: row.uomSymbol ?? null }
  })
}

export interface ProductInput {
  code?: string | null
  name: string
  description?: string | null
  type: ProductTypeValue
  categoryId?: string | null
  uomId?: string | null
  salePrice: number
  costPrice: number
  revenueAccountId?: string | null
  expenseAccountId?: string | null
  defaultSaleTaxIds?: string[]
  defaultPurchaseTaxIds?: string[]
  notes?: string | null
}

export async function createProduct(
  tenantId: string,
  input: ProductInput,
): Promise<{ ok: true; product: Product } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Nama produk wajib diisi.' }

  return withTenant(tenantId, async (tx) => {
    const code = input.code?.trim() || null
    if (code) {
      const conflict = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.code, code)))
        .limit(1)
      if (conflict.length > 0) return { ok: false as const, error: 'Kode produk sudah digunakan.' }
    }

    const [product] = await tx
      .insert(products)
      .values({
        tenantId,
        code,
        name,
        description: input.description?.trim() || null,
        type: input.type,
        categoryId: input.categoryId || null,
        uomId: input.uomId || null,
        salePrice: input.salePrice,
        costPrice: input.costPrice,
        revenueAccountId: input.revenueAccountId || null,
        expenseAccountId: input.expenseAccountId || null,
        defaultSaleTaxIds: input.defaultSaleTaxIds ?? [],
        defaultPurchaseTaxIds: input.defaultPurchaseTaxIds ?? [],
        notes: input.notes?.trim() || null,
      })
      .returning()

    return { ok: true as const, product: product! }
  })
}

export async function updateProduct(
  tenantId: string,
  id: string,
  input: Partial<ProductInput>,
): Promise<{ ok: true; product: Product } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const patch: Record<string, unknown> = { updatedAt: new Date() }

    if (input.name !== undefined) {
      const n = input.name.trim()
      if (!n) return { ok: false as const, error: 'Nama produk wajib diisi.' }
      patch.name = n
    }
    if (input.code !== undefined) {
      const code = input.code?.trim() || null
      if (code) {
        const conflict = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.code, code)))
          .limit(1)
        if (conflict.length > 0 && conflict[0]!.id !== id) {
          return { ok: false as const, error: 'Kode produk sudah digunakan.' }
        }
      }
      patch.code = code
    }
    if (input.description !== undefined) patch.description = input.description?.trim() || null
    if (input.type !== undefined) patch.type = input.type
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId || null
    if (input.uomId !== undefined) patch.uomId = input.uomId || null
    if (input.salePrice !== undefined) patch.salePrice = input.salePrice
    if (input.costPrice !== undefined) patch.costPrice = input.costPrice
    if (input.revenueAccountId !== undefined) patch.revenueAccountId = input.revenueAccountId || null
    if (input.expenseAccountId !== undefined) patch.expenseAccountId = input.expenseAccountId || null
    if (input.defaultSaleTaxIds !== undefined) patch.defaultSaleTaxIds = input.defaultSaleTaxIds
    if (input.defaultPurchaseTaxIds !== undefined) patch.defaultPurchaseTaxIds = input.defaultPurchaseTaxIds
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null

    const [product] = await tx
      .update(products)
      .set(patch)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning()

    if (!product) return { ok: false as const, error: 'Produk tidak ditemukan.' }
    return { ok: true as const, product }
  })
}

export async function archiveProduct(tenantId: string, id: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId))),
  )
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(tenantId: string): Promise<ProductCategory[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId))
      .orderBy(asc(productCategories.name)),
  )
}

export async function createCategory(
  tenantId: string,
  name: string,
  description?: string | null,
): Promise<ProductCategory> {
  return withTenant(tenantId, async (tx) => {
    const [cat] = await tx
      .insert(productCategories)
      .values({ tenantId, name: name.trim(), description: description?.trim() || null })
      .returning()
    return cat!
  })
}

// ── Units of Measure ──────────────────────────────────────────────────────────

export async function listUom(tenantId: string): Promise<Uom[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(uom)
      .where(eq(uom.tenantId, tenantId))
      .orderBy(asc(uom.name)),
  )
}

export async function seedDefaultUom(tenantId: string): Promise<number> {
  const defaults = [
    { name: 'Pcs',   symbol: 'pcs',  isDefault: true  },
    { name: 'Lusin', symbol: 'lsn',  isDefault: false },
    { name: 'Kodi',  symbol: 'kdi',  isDefault: false },
    { name: 'Kg',    symbol: 'kg',   isDefault: false },
    { name: 'Gram',  symbol: 'g',    isDefault: false },
    { name: 'Liter', symbol: 'L',    isDefault: false },
    { name: 'Meter', symbol: 'm',    isDefault: false },
    { name: 'Box',   symbol: 'box',  isDefault: false },
    { name: 'Jam',   symbol: 'jam',  isDefault: false },
    { name: 'Hari',  symbol: 'hari', isDefault: false },
    { name: 'Bulan', symbol: 'bln',  isDefault: false },
  ]

  return withTenant(tenantId, async (tx) => {
    const existing = await tx
      .select({ name: uom.name })
      .from(uom)
      .where(eq(uom.tenantId, tenantId))
    const existingNames = new Set(existing.map((r) => r.name))
    const toInsert = defaults.filter((d) => !existingNames.has(d.name))
    if (toInsert.length === 0) return 0
    await tx.insert(uom).values(toInsert.map((d) => ({ tenantId, ...d })))
    return toInsert.length
  })
}

export async function getProductStats(tenantId: string): Promise<{
  total: number
  active: number
  byType: Record<ProductTypeValue, number>
}> {
  return withTenant(tenantId, async (tx) => {
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.tenantId, tenantId))

    const [{ active }] = await tx
      .select({ active: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))

    const typeCounts = await tx
      .select({ type: products.type, count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .groupBy(products.type)

    const byType: Record<ProductTypeValue, number> = { product: 0, service: 0, consumable: 0 }
    for (const r of typeCounts) byType[r.type] = r.count

    return { total, active, byType }
  })
}
