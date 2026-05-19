import 'server-only'
import { and, asc, desc, eq, gt, lt, ne, or, ilike, inArray } from 'drizzle-orm'
import {
  assets,
  rentCustomers,
  reservations,
  type Asset,
  type AssetCategory,
  type AssetStatus,
  type RentCustomer,
  type CustomerType,
  type Reservation,
  type ReservationStatus,
  type RateUnit,
} from '@kantorcore/db'
import { withTenant } from './db'

// ── Assets ────────────────────────────────────────────────────────────────────

export interface AssetFilter {
  category?: AssetCategory
  status?: AssetStatus
  search?: string
}

export async function listAssets(
  tenantId: string,
  filter: AssetFilter = {},
  limit = 200,
): Promise<Asset[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(assets.tenantId, tenantId)]
    if (filter.category) conditions.push(eq(assets.category, filter.category))
    if (filter.status) conditions.push(eq(assets.status, filter.status))
    if (filter.search) {
      const q = `%${filter.search}%`
      conditions.push(
        or(
          ilike(assets.name, q),
          ilike(assets.assetCode, q),
          ilike(assets.location, q),
        )!,
      )
    }
    return tx
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(asc(assets.name))
      .limit(limit)
  })
}

export async function getAsset(tenantId: string, id: string): Promise<Asset | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(assets)
      .where(and(eq(assets.tenantId, tenantId), eq(assets.id, id)))
      .limit(1)
    return rows[0] ?? null
  })
}

export interface AssetInput {
  assetCode?: string | null
  name: string
  category?: AssetCategory
  status?: AssetStatus
  description?: string | null
  location?: string | null
  hourlyRate?: number | null
  dailyRate?: number | null
  weeklyRate?: number | null
  monthlyRate?: number | null
  depositAmount?: number | null
  metadata?: Record<string, unknown>
}

export async function createAsset(
  tenantId: string,
  input: AssetInput,
): Promise<{ ok: true; asset: Asset } | { ok: false; error: string }> {
  const name = input.name?.trim()
  if (!name) return { ok: false, error: 'Nama aset wajib diisi.' }

  return withTenant(tenantId, async (tx) => {
    const [asset] = await tx
      .insert(assets)
      .values({
        tenantId,
        name,
        assetCode: input.assetCode?.trim() || null,
        category: input.category ?? 'equipment',
        status: input.status ?? 'available',
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        hourlyRate: input.hourlyRate ?? null,
        dailyRate: input.dailyRate ?? null,
        weeklyRate: input.weeklyRate ?? null,
        monthlyRate: input.monthlyRate ?? null,
        depositAmount: input.depositAmount ?? null,
        metadata: input.metadata ?? {},
      })
      .returning()
    return { ok: true, asset }
  })
}

export async function updateAsset(
  tenantId: string,
  id: string,
  patch: Partial<AssetInput>,
): Promise<{ ok: true; asset: Asset } | { ok: false; error: string }> {
  const values: Record<string, unknown> = { updatedAt: new Date() }
  if ('name' in patch && patch.name !== undefined) {
    if (!patch.name.trim()) return { ok: false, error: 'Nama aset wajib diisi.' }
    values['name'] = patch.name.trim()
  }
  if ('assetCode' in patch) values['assetCode'] = patch.assetCode?.trim() || null
  if ('category' in patch) values['category'] = patch.category
  if ('status' in patch) values['status'] = patch.status
  if ('description' in patch) values['description'] = patch.description?.trim() || null
  if ('location' in patch) values['location'] = patch.location?.trim() || null
  if ('hourlyRate' in patch) values['hourlyRate'] = patch.hourlyRate ?? null
  if ('dailyRate' in patch) values['dailyRate'] = patch.dailyRate ?? null
  if ('weeklyRate' in patch) values['weeklyRate'] = patch.weeklyRate ?? null
  if ('monthlyRate' in patch) values['monthlyRate'] = patch.monthlyRate ?? null
  if ('depositAmount' in patch) values['depositAmount'] = patch.depositAmount ?? null
  if ('metadata' in patch) values['metadata'] = patch.metadata ?? {}

  return withTenant(tenantId, async (tx) => {
    const [asset] = await tx
      .update(assets)
      .set(values as never)
      .where(and(eq(assets.tenantId, tenantId), eq(assets.id, id)))
      .returning()
    if (!asset) return { ok: false, error: 'Aset tidak ditemukan.' }
    return { ok: true, asset }
  })
}

export async function deleteAsset(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    // Block delete if reservations exist that aren't terminal
    const blocking = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, tenantId),
          eq(reservations.assetId, id),
          inArray(reservations.status, ['draft', 'confirmed', 'active']),
        ),
      )
      .limit(1)
    if (blocking[0]) {
      return { ok: false, error: 'Tidak bisa dihapus — masih ada reservasi aktif/terkonfirmasi.' }
    }
    const result = await tx
      .delete(assets)
      .where(and(eq(assets.tenantId, tenantId), eq(assets.id, id)))
      .returning({ id: assets.id })
    if (!result[0]) return { ok: false, error: 'Aset tidak ditemukan.' }
    return { ok: true }
  })
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function listRentCustomers(tenantId: string, search?: string): Promise<RentCustomer[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(rentCustomers.tenantId, tenantId)]
    if (search) {
      const q = `%${search}%`
      conditions.push(
        or(
          ilike(rentCustomers.name, q),
          ilike(rentCustomers.email, q),
          ilike(rentCustomers.phone, q),
        )!,
      )
    }
    return tx
      .select()
      .from(rentCustomers)
      .where(and(...conditions))
      .orderBy(asc(rentCustomers.name))
  })
}

export interface CustomerInput {
  name: string
  customerType?: CustomerType
  email?: string | null
  phone?: string | null
  address?: string | null
  idNumber?: string | null
  notes?: string | null
}

export async function createRentCustomer(
  tenantId: string,
  input: CustomerInput,
): Promise<{ ok: true; customer: RentCustomer } | { ok: false; error: string }> {
  const name = input.name?.trim()
  if (!name) return { ok: false, error: 'Nama pelanggan wajib diisi.' }

  return withTenant(tenantId, async (tx) => {
    const [customer] = await tx
      .insert(rentCustomers)
      .values({
        tenantId,
        name,
        customerType: input.customerType ?? 'individual',
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        idNumber: input.idNumber?.replace(/\s/g, '') || null,
        notes: input.notes?.trim() || null,
      })
      .returning()
    return { ok: true, customer }
  })
}

// ── Reservations ──────────────────────────────────────────────────────────────

export interface ReservationWithRelations extends Reservation {
  assetName: string
  assetCategory: AssetCategory
  customerName: string
}

export interface ReservationFilter {
  status?: ReservationStatus
  assetId?: string
}

export async function listReservations(
  tenantId: string,
  filter: ReservationFilter = {},
  limit = 200,
): Promise<ReservationWithRelations[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(reservations.tenantId, tenantId)]
    if (filter.status) conditions.push(eq(reservations.status, filter.status))
    if (filter.assetId) conditions.push(eq(reservations.assetId, filter.assetId))

    const rows = await tx
      .select({
        r: reservations,
        assetName: assets.name,
        assetCategory: assets.category,
        customerName: rentCustomers.name,
      })
      .from(reservations)
      .innerJoin(assets, eq(reservations.assetId, assets.id))
      .innerJoin(rentCustomers, eq(reservations.customerId, rentCustomers.id))
      .where(and(...conditions))
      .orderBy(desc(reservations.startAt))
      .limit(limit)

    return rows.map((r) => ({
      ...r.r,
      assetName: r.assetName,
      assetCategory: r.assetCategory,
      customerName: r.customerName,
    }))
  })
}

export async function getReservation(
  tenantId: string,
  id: string,
): Promise<ReservationWithRelations | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        r: reservations,
        assetName: assets.name,
        assetCategory: assets.category,
        customerName: rentCustomers.name,
      })
      .from(reservations)
      .innerJoin(assets, eq(reservations.assetId, assets.id))
      .innerJoin(rentCustomers, eq(reservations.customerId, rentCustomers.id))
      .where(and(eq(reservations.tenantId, tenantId), eq(reservations.id, id)))
      .limit(1)
    if (!rows[0]) return null
    return {
      ...rows[0].r,
      assetName: rows[0].assetName,
      assetCategory: rows[0].assetCategory,
      customerName: rows[0].customerName,
    }
  })
}

/**
 * Find reservations that conflict with the given time range on a given asset.
 * Excludes 'cancelled' and 'completed' (terminal states). Optional exclude id
 * for editing an existing reservation.
 */
export async function findConflictingReservations(
  tenantId: string,
  assetId: string,
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string,
): Promise<Reservation[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [
      eq(reservations.tenantId, tenantId),
      eq(reservations.assetId, assetId),
      inArray(reservations.status, ['draft', 'confirmed', 'active']),
      // Overlap: existing.start < newEnd AND existing.end > newStart
      lt(reservations.startAt, endAt),
      gt(reservations.endAt, startAt),
    ]
    if (excludeReservationId) {
      conditions.push(ne(reservations.id, excludeReservationId))
    }
    return tx
      .select()
      .from(reservations)
      .where(and(...conditions))
  })
}

export interface ReservationInput {
  assetId: string
  customerId: string
  startAt: string  // ISO datetime
  endAt: string
  rateAmount: number
  rateUnit: RateUnit
  totalAmount?: number
  depositAmount?: number
  notes?: string | null
}

export async function createReservation(
  tenantId: string,
  input: ReservationInput,
): Promise<{ ok: true; reservation: Reservation } | { ok: false; error: string }> {
  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return { ok: false, error: 'Tanggal tidak valid.' }
  }
  if (endAt <= startAt) {
    return { ok: false, error: 'Tanggal selesai harus setelah tanggal mulai.' }
  }

  const conflicts = await findConflictingReservations(tenantId, input.assetId, startAt, endAt)
  if (conflicts.length > 0) {
    return { ok: false, error: `Aset sudah dipesan untuk rentang waktu yang tumpang tindih (${conflicts.length} bentrok).` }
  }

  return withTenant(tenantId, async (tx) => {
    const [resv] = await tx
      .insert(reservations)
      .values({
        tenantId,
        assetId: input.assetId,
        customerId: input.customerId,
        status: 'draft',
        startAt,
        endAt,
        rateAmount: input.rateAmount,
        rateUnit: input.rateUnit,
        totalAmount: input.totalAmount ?? 0,
        depositAmount: input.depositAmount ?? 0,
        notes: input.notes?.trim() || null,
      })
      .returning()
    return { ok: true, reservation: resv }
  })
}

export async function updateReservationStatus(
  tenantId: string,
  id: string,
  newStatus: ReservationStatus,
): Promise<{ ok: true; reservation: Reservation } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const [current] = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.tenantId, tenantId), eq(reservations.id, id)))
      .limit(1)
    if (!current) return { ok: false, error: 'Reservasi tidak ditemukan.' }

    const transition: Record<ReservationStatus, ReservationStatus[]> = {
      draft: ['confirmed', 'cancelled'],
      confirmed: ['active', 'cancelled'],
      active: ['completed'],
      completed: [],
      cancelled: [],
    }
    if (!transition[current.status].includes(newStatus)) {
      return { ok: false, error: `Tidak bisa mengubah status dari "${current.status}" ke "${newStatus}".` }
    }

    const values: Record<string, unknown> = { status: newStatus, updatedAt: new Date() }
    if (newStatus === 'active') values['actualStartAt'] = new Date()
    if (newStatus === 'completed') values['actualEndAt'] = new Date()

    // Side-effect: keep asset.status in sync
    const assetStatusByResv: Partial<Record<ReservationStatus, AssetStatus>> = {
      confirmed: 'reserved',
      active: 'rented',
      completed: 'available',
      cancelled: 'available',
    }
    const newAssetStatus = assetStatusByResv[newStatus]
    if (newAssetStatus) {
      await tx
        .update(assets)
        .set({ status: newAssetStatus, updatedAt: new Date() })
        .where(and(eq(assets.tenantId, tenantId), eq(assets.id, current.assetId)))
    }

    const [resv] = await tx
      .update(reservations)
      .set(values as never)
      .where(and(eq(reservations.tenantId, tenantId), eq(reservations.id, id)))
      .returning()
    return { ok: true, reservation: resv }
  })
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  equipment: 'Peralatan',
  vehicle: 'Kendaraan',
  property: 'Properti',
  room: 'Kamar',
  venue: 'Tempat Acara',
  other: 'Lainnya',
}

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  available: 'Tersedia',
  reserved: 'Dipesan',
  rented: 'Disewa',
  maintenance: 'Perawatan',
  retired: 'Pensiun',
}

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  draft: 'Draft',
  confirmed: 'Terkonfirmasi',
  active: 'Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  hour: 'Jam',
  day: 'Hari',
  week: 'Minggu',
  month: 'Bulan',
}

export function formatIDR(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
