import type {
  Reservation,
  AssetCategory,
  AssetStatus,
  ReservationStatus,
  RateUnit,
} from '@kantorcore/db'

export type { AssetCategory, AssetStatus, ReservationStatus, RateUnit }

export interface ReservationWithRelations extends Reservation {
  assetName: string
  assetCategory: AssetCategory
  customerName: string
}

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
