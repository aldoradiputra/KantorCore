// Charts
export { PipelineFunnel }        from './PipelineFunnel'
export { ForecastWaterfall }     from './ForecastWaterfall'
export { MemberPerformanceBars } from './MemberPerformanceBars'
export { UtmSourceDonut }        from './UtmSourceDonut'
export { ProbabilityHistogram }  from './ProbabilityHistogram'
export { StageValueTrend }       from './StageValueTrend'

// Shared primitives
export { ChartCard }             from './ChartCard'

// Registry
export { CHART_REGISTRY, CHART_LIST, getChart } from './registry'
export type { ChartId, ChartMeta }              from './registry'

// Tokens (for consumers that need to match chart colors)
export {
  STAGE_ORDER, STAGE_LABEL, STAGE_COLOR,
  SERIES_PALETTE, formatIDR,
  TOOLTIP_STYLE, AXIS_TICK, MONO_TICK,
} from './_tokens'

// Data shape re-exports for convenience
export type { FunnelStage }        from './PipelineFunnel'
export type { WaterfallData }      from './ForecastWaterfall'
export type { UtmEntry }           from './UtmSourceDonut'
export type { ProbabilityDeal }    from './ProbabilityHistogram'
export type { TrendPoint }         from './StageValueTrend'
