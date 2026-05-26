// Client-safe CRM constants — no server-only imports
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

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
