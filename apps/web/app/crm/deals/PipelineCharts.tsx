'use client'

import { useState } from 'react'
import { PipelineFunnel, ProbabilityHistogram, ChartCard } from '../../../components/charts'
import type { FunnelStage } from '../../../components/charts'
import type { ProbabilityPoint } from '../../../lib/crm-forecast'

interface Props {
  funnelData: FunnelStage[]
  probabilityDeals: ProbabilityPoint[]
}

type FunnelMetric = 'count' | 'value'
type HistoMetric  = 'count' | 'value'

export default function PipelineCharts({ funnelData, probabilityDeals }: Props) {
  const [funnelMetric, setFunnelMetric] = useState<FunnelMetric>('count')
  const [histoMetric,  setHistoMetric]  = useState<HistoMetric>('count')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', flexShrink: 0 }}>
      {/* Pipeline funnel */}
      <ChartCard
        title="Funnel Pipeline"
        controls={[
          { label: 'Jumlah', value: 'count', active: funnelMetric === 'count', onClick: () => setFunnelMetric('count') },
          { label: 'Nilai',  value: 'value', active: funnelMetric === 'value', onClick: () => setFunnelMetric('value') },
        ]}
      >
        <PipelineFunnel data={funnelData} metric={funnelMetric} height={200} />
      </ChartCard>

      {/* Probability distribution */}
      <ChartCard
        title="Distribusi Probabilitas"
        controls={[
          { label: 'Jumlah', value: 'count', active: histoMetric === 'count', onClick: () => setHistoMetric('count') },
          { label: 'Nilai',  value: 'value', active: histoMetric === 'value', onClick: () => setHistoMetric('value') },
        ]}
      >
        <ProbabilityHistogram deals={probabilityDeals} metric={histoMetric} height={200} />
      </ChartCard>
    </div>
  )
}

