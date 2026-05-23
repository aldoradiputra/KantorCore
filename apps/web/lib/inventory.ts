import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  stockLocations, stockMoves, stockQuants, products, users,
  type StockLocation, type StockMove, type StockLocationType,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { StockLocation, StockMove, StockLocationType }

// ── Locations ─────────────────────────────────────────────────────────────────

export async function listLocations(tenantId: string): Promise<StockLocation[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(stockLocations)
      .where(and(eq(stockLocations.tenantId, tenantId), eq(stockLocations.isActive, true)))
      .orderBy(asc(stockLocations.code)),
  )
}

// Standard locations seeded for every new workspace
const DEFAULT_LOCATIONS: { code: string; name: string; type: StockLocationType }[] = [
  { code: 'WH',     name: 'Gudang Utama',          type: 'internal'  },
  { code: 'VENDOR', name: 'Vendor (Eksternal)',     type: 'external'  },
  { code: 'CUST',   name: 'Pelanggan (Eksternal)', type: 'external'  },
  { code: 'ADJ',    name: 'Penyesuaian Stok',      type: 'virtual'   },
  { code: 'SCRAP',  name: 'Barang Rusak/Sisa',     type: 'virtual'   },
]

export async function seedDefaultLocations(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    const existing = await tx
      .select({ code: stockLocations.code })
      .from(stockLocations)
      .where(eq(stockLocations.tenantId, tenantId))
    const existingCodes = new Set(existing.map((r) => r.code))
    const toInsert = DEFAULT_LOCATIONS.filter((l) => !existingCodes.has(l.code))
    if (toInsert.length === 0) return 0
    await tx.insert(stockLocations).values(toInsert.map((l) => ({ tenantId, ...l })))
    return toInsert.length
  })
}

// ── On-hand quants ────────────────────────────────────────────────────────────

export interface OnHandRow {
  productId: string
  productCode: string | null
  productName: string
  locationId: string
  locationCode: string
  locationName: string
  qty: number
}

export async function listOnHand(
  tenantId: string,
  opts: { locationId?: string; productId?: string; internalOnly?: boolean } = {},
): Promise<OnHandRow[]> {
  return withTenant(tenantId, async (tx) => {
    const locs = await tx
      .select({ id: stockLocations.id, code: stockLocations.code, name: stockLocations.name, type: stockLocations.type })
      .from(stockLocations)
      .where(eq(stockLocations.tenantId, tenantId))

    const locMap = new Map(locs.map((l) => [l.id, l]))

    let quantWhere = eq(stockQuants.tenantId, tenantId)
    if (opts.productId) quantWhere = and(quantWhere, eq(stockQuants.productId, opts.productId))!
    if (opts.locationId) quantWhere = and(quantWhere, eq(stockQuants.locationId, opts.locationId))!

    const rows = await tx
      .select({
        quant: stockQuants,
        productCode: products.code,
        productName: products.name,
      })
      .from(stockQuants)
      .innerJoin(products, eq(stockQuants.productId, products.id))
      .where(quantWhere)
      .orderBy(asc(products.name))

    return rows
      .filter((r) => {
        const loc = locMap.get(r.quant.locationId)
        if (opts.internalOnly && loc?.type !== 'internal') return false
        return r.quant.qty !== 0
      })
      .map((r) => {
        const loc = locMap.get(r.quant.locationId)!
        return {
          productId: r.quant.productId,
          productCode: r.productCode,
          productName: r.productName,
          locationId: r.quant.locationId,
          locationCode: loc.code,
          locationName: loc.name,
          qty: r.quant.qty,
        }
      })
  })
}

export async function getOnHand(tenantId: string, productId: string): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    const internalLocs = await tx
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(and(eq(stockLocations.tenantId, tenantId), eq(stockLocations.type, 'internal')))

    if (internalLocs.length === 0) return 0
    const locIds = internalLocs.map((l) => l.id)

    const [{ total }] = await tx
      .select({ total: sql<number>`COALESCE(SUM(qty), 0)::int` })
      .from(stockQuants)
      .where(
        and(
          eq(stockQuants.tenantId, tenantId),
          eq(stockQuants.productId, productId),
          sql`${stockQuants.locationId} = ANY(${locIds})`,
        ),
      )

    return total
  })
}

// ── Stock moves ───────────────────────────────────────────────────────────────

export interface MoveRow {
  move: StockMove
  productName: string
  productCode: string | null
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  createdByName: string | null
}

export async function listMoves(
  tenantId: string,
  opts: { productId?: string; locationId?: string; limit?: number } = {},
): Promise<MoveRow[]> {
  return withTenant(tenantId, async (tx) => {
    const fromLoc = { id: stockLocations.id, code: stockLocations.code, name: stockLocations.name }
    const toLoc   = { id: stockLocations.id, code: stockLocations.code, name: stockLocations.name }

    // Drizzle aliased joins for from/to
    const fromAlias = stockLocations
    const toAlias   = stockLocations

    let where = and(eq(stockMoves.tenantId, tenantId), eq(stockMoves.state, 'done'))!
    if (opts.productId)  where = and(where, eq(stockMoves.productId, opts.productId))!
    if (opts.locationId) {
      where = and(
        where,
        sql`(${stockMoves.fromLocationId} = ${opts.locationId} OR ${stockMoves.toLocationId} = ${opts.locationId})`,
      )!
    }

    const rows = await tx
      .select({
        move:          stockMoves,
        productName:   products.name,
        productCode:   products.code,
        createdByName: users.name,
      })
      .from(stockMoves)
      .innerJoin(products, eq(stockMoves.productId, products.id))
      .leftJoin(users, eq(stockMoves.createdBy, users.id))
      .where(where)
      .orderBy(desc(stockMoves.movedAt))
      .limit(opts.limit ?? 200)

    // Resolve locations separately (avoid complex aliased joins)
    const locIds = [...new Set(rows.flatMap((r) => [r.move.fromLocationId, r.move.toLocationId]))]
    const locs = locIds.length > 0
      ? await tx.select().from(stockLocations).where(sql`${stockLocations.id} = ANY(${locIds})`)
      : []
    const locMap = new Map(locs.map((l) => [l.id, l]))

    return rows.map((r) => ({
      move: r.move,
      productName: r.productName,
      productCode: r.productCode,
      fromCode: locMap.get(r.move.fromLocationId)?.code ?? '?',
      fromName: locMap.get(r.move.fromLocationId)?.name ?? '?',
      toCode:   locMap.get(r.move.toLocationId)?.code ?? '?',
      toName:   locMap.get(r.move.toLocationId)?.name ?? '?',
      createdByName: r.createdByName,
    }))
  })
}

// ── Core: create move + update quants atomically ──────────────────────────────

export async function createMove(input: {
  tenantId: string
  productId: string
  fromLocationId: string
  toLocationId: string
  qty: number
  reference?: string
  notes?: string
  userId?: string
}): Promise<{ ok: true; move: StockMove } | { ok: false; error: string }> {
  if (input.qty <= 0) return { ok: false, error: 'Kuantitas harus lebih dari 0.' }
  if (input.fromLocationId === input.toLocationId) return { ok: false, error: 'Lokasi asal dan tujuan tidak boleh sama.' }

  return withTenant(input.tenantId, async (tx) => {
    const [move] = await tx
      .insert(stockMoves)
      .values({
        tenantId:       input.tenantId,
        productId:      input.productId,
        fromLocationId: input.fromLocationId,
        toLocationId:   input.toLocationId,
        qty:            input.qty,
        reference:      input.reference ?? null,
        notes:          input.notes ?? null,
        state:          'done',
        createdBy:      input.userId ?? null,
      })
      .returning()

    // Decrement from-location quant
    await tx
      .insert(stockQuants)
      .values({ tenantId: input.tenantId, productId: input.productId, locationId: input.fromLocationId, qty: -input.qty })
      .onConflictDoUpdate({
        target: [stockQuants.tenantId, stockQuants.productId, stockQuants.locationId],
        set: { qty: sql`${stockQuants.qty} - ${input.qty}`, updatedAt: new Date() },
      })

    // Increment to-location quant
    await tx
      .insert(stockQuants)
      .values({ tenantId: input.tenantId, productId: input.productId, locationId: input.toLocationId, qty: input.qty })
      .onConflictDoUpdate({
        target: [stockQuants.tenantId, stockQuants.productId, stockQuants.locationId],
        set: { qty: sql`${stockQuants.qty} + ${input.qty}`, updatedAt: new Date() },
      })

    return { ok: true as const, move: move! }
  })
}

// ── Manual stock adjustment ───────────────────────────────────────────────────

export async function adjustStock(input: {
  tenantId: string
  productId: string
  locationId: string       // internal location to adjust
  newQty: number           // target on-hand qty at this location
  reference?: string
  notes?: string
  userId?: string
  adjLocationCode?: string // defaults to 'ADJ'
}): Promise<{ ok: true; move: StockMove; delta: number } | { ok: false; error: string }> {
  if (input.newQty < 0) return { ok: false, error: 'Stok tidak boleh negatif.' }

  return withTenant(input.tenantId, async (tx) => {
    // Current qty at location
    const existing = await tx
      .select({ qty: stockQuants.qty })
      .from(stockQuants)
      .where(
        and(
          eq(stockQuants.tenantId, input.tenantId),
          eq(stockQuants.productId, input.productId),
          eq(stockQuants.locationId, input.locationId),
        ),
      )
      .limit(1)

    const currentQty = existing[0]?.qty ?? 0
    const delta = input.newQty - currentQty
    if (delta === 0) return { ok: false as const, error: 'Stok sudah sesuai, tidak ada perubahan.' }

    // Resolve ADJ virtual location
    const adjCode = input.adjLocationCode ?? 'ADJ'
    const [adjLoc] = await tx
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(and(eq(stockLocations.tenantId, input.tenantId), eq(stockLocations.code, adjCode)))
      .limit(1)

    if (!adjLoc) return { ok: false as const, error: `Lokasi virtual '${adjCode}' belum ada. Seed lokasi default terlebih dahulu.` }

    const fromId = delta > 0 ? adjLoc.id : input.locationId
    const toId   = delta > 0 ? input.locationId : adjLoc.id
    const qty    = Math.abs(delta)

    const result = await createMove({
      tenantId:       input.tenantId,
      productId:      input.productId,
      fromLocationId: fromId,
      toLocationId:   toId,
      qty,
      reference:      input.reference ?? 'ADJ',
      notes:          input.notes ?? undefined,
      userId:         input.userId,
    })

    if (!result.ok) return result
    return { ok: true as const, move: result.move, delta }
  })
}
