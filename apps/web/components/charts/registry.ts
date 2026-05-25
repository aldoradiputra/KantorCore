/**
 * Chart registry — canonical list of every composable chart in the system.
 *
 * Each entry declares:
 *   id          — stable identifier, used for saved dashboard layouts
 *   name        — display name (Indonesian)
 *   description — one-line description of what it answers
 *   dataKey     — which lib function feeds this chart (documents the data contract)
 *   defaultProps — default values for optional props
 *   pages       — where this chart is currently placed
 *
 * Components are NOT imported here (avoids circular deps + keeps this file
 * importable in server components). Use the id to look up the component in
 * the lazy-load map in DashboardBuilder if/when that ships.
 */

export type ChartId =
  | 'pipeline_funnel'
  | 'probability_histogram'
  | 'forecast_waterfall'
  | 'stage_value_trend'
  | 'member_performance_bars'
  | 'utm_source_donut'

export interface ChartMeta {
  id:          ChartId
  name:        string
  description: string
  /** lib function(s) that produce the required data */
  dataKey:     string | string[]
  /** configurable prop keys with their default values */
  defaultProps: Record<string, unknown>
  /** metric toggle options, if the chart supports them */
  metricOptions?: { value: string; label: string }[]
  /** pages where this chart is currently embedded */
  pages:       string[]
  /** tags for future filtering in a chart picker */
  tags:        string[]
}

export const CHART_REGISTRY: Record<ChartId, ChartMeta> = {

  pipeline_funnel: {
    id:          'pipeline_funnel',
    name:        'Funnel Pipeline',
    description: 'Jumlah atau nilai deal per tahap, menampilkan bottleneck konversi.',
    dataKey:     'getPipelineSummary',
    defaultProps: { metric: 'count', height: 200 },
    metricOptions: [
      { value: 'count', label: 'Jumlah' },
      { value: 'value', label: 'Nilai' },
    ],
    pages: ['/crm/deals'],
    tags:  ['pipeline', 'funnel', 'conversion'],
  },

  probability_histogram: {
    id:          'probability_histogram',
    name:        'Distribusi Probabilitas',
    description: 'Sebaran deal berdasarkan rentang probabilitas penutupan.',
    dataKey:     'getProbabilityDistribution',
    defaultProps: { metric: 'count', height: 200 },
    metricOptions: [
      { value: 'count', label: 'Jumlah' },
      { value: 'value', label: 'Nilai' },
    ],
    pages: ['/crm/deals'],
    tags:  ['pipeline', 'probability', 'risk'],
  },

  forecast_waterfall: {
    id:          'forecast_waterfall',
    name:        'Waterfall Forecast',
    description: 'Best / Expected / Worst case dibandingkan target dan revenue yang sudah ditutup.',
    dataKey:     'getForecast',
    defaultProps: { height: 220 },
    pages: ['/crm/forecast'],
    tags:  ['forecast', 'revenue', 'target'],
  },

  stage_value_trend: {
    id:          'stage_value_trend',
    name:        'Tren Pipeline Mingguan',
    description: 'Nilai deal per tahap selama 8 minggu terakhir (area chart berlapis).',
    dataKey:     'getPipelineTrend',
    defaultProps: { height: 220, stages: ['lead', 'qualified', 'proposal', 'negotiation', 'won'] },
    pages: ['/crm/forecast'],
    tags:  ['trend', 'pipeline', 'time-series'],
  },

  member_performance_bars: {
    id:          'member_performance_bars',
    name:        'Kinerja Anggota Tim',
    description: 'Bar per anggota — pendapatan menang atau jumlah deal, dengan garis target.',
    dataKey:     'getTeam',
    defaultProps: { metric: 'revenue', height: 240 },
    metricOptions: [
      { value: 'revenue', label: 'Pendapatan' },
      { value: 'deals',   label: 'Deal' },
    ],
    pages: ['/crm/teams/[id]'],
    tags:  ['team', 'performance', 'leaderboard'],
  },

  utm_source_donut: {
    id:          'utm_source_donut',
    name:        'Atribusi Sumber (UTM)',
    description: 'Proporsi deal atau revenue per saluran akuisisi.',
    dataKey:     'getUtmBreakdown',
    defaultProps: { metric: 'revenue', height: 220 },
    metricOptions: [
      { value: 'revenue', label: 'Nilai' },
      { value: 'count',   label: 'Jumlah' },
    ],
    pages: ['/crm/forecast', '/crm/reports'],
    tags:  ['attribution', 'utm', 'marketing'],
  },

}

/** Ordered list for display (e.g. chart picker UI). */
export const CHART_LIST: ChartMeta[] = Object.values(CHART_REGISTRY)

/** Look up a single chart entry. */
export function getChart(id: ChartId): ChartMeta {
  return CHART_REGISTRY[id]
}
