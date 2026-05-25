import type { DealStage } from '../../lib/crm'

// ── Stage metadata ────────────────────────────────────────────────────────────

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

export const STAGE_COLOR: Record<DealStage, string> = {
  lead:        '#6B7280',
  qualified:   '#3B4FC4',
  proposal:    '#7C3AED',
  negotiation: '#B35A00',
  won:         '#0F7B6C',
  lost:        '#DC2626',
}

// ── Color palette (for non-stage series) ─────────────────────────────────────

export const SERIES_PALETTE = [
  '#3B4FC4', '#0F7B6C', '#B35A00', '#7C3AED', '#DC2626',
  '#0891B2', '#65A30D', '#DB2777', '#9333EA', '#6B7280',
]

// ── Currency formatter ────────────────────────────────────────────────────────

export function formatIDR(v: number): string {
  if (v === 0) return 'Rp 0'
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(0)}jt`
  return 'Rp ' + v.toLocaleString('id-ID')
}

// ── Common tooltip shell ──────────────────────────────────────────────────────

export const TOOLTIP_STYLE: React.CSSProperties = {
  padding:      '10px 12px',
  background:   'var(--surface)',
  border:       '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  font:         '12px/1.5 var(--font-sans)',
}

// ── Common axis tick style ────────────────────────────────────────────────────

export const AXIS_TICK = {
  fontSize:   11,
  fill:       'var(--fg-3)',
  fontFamily: 'var(--font-sans)',
} as const

export const MONO_TICK = {
  fontSize:   10,
  fill:       'var(--fg-3)',
  fontFamily: 'var(--font-mono, monospace)',
} as const
