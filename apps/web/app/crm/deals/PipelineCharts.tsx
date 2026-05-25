'use client'

import { useState } from 'react'
import { PipelineFunnel } from '../../../components/charts/PipelineFunnel'
import { ProbabilityHistogram } from '../../../components/charts/ProbabilityHistogram'
import type { FunnelStage } from '../../../components/charts/PipelineFunnel'
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

function ChartCard({
  title, controls, children,
}: {
  title: string
  controls?: { label: string; value: string; active: boolean; onClick: () => void }[]
  children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--s-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-3)' }}>
        <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{title}</div>
        {controls && (
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
            {controls.map((c) => (
              <button
                key={c.value}
                onClick={c.onClick}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  background: c.active ? 'var(--indigo)' : 'var(--surface)',
                  color: c.active ? 'white' : 'var(--fg-3)',
                  font: '11px/1 var(--font-sans)',
                  cursor: 'pointer',
                  borderRight: '1px solid var(--border)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
