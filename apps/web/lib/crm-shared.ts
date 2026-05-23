import type { DealStage, ActivityType } from '@kantorcore/db'

export type { DealStage, ActivityType }

export const STAGE_ORDER: DealStage[] = [
  'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
]

export const STAGE_LABEL: Record<DealStage, string> = {
  lead:        'Prospek',
  qualified:   'Terverifikasi',
  proposal:    'Penawaran',
  negotiation: 'Negosiasi',
  won:         'Menang',
  lost:        'Kalah',
}
