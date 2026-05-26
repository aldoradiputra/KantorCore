'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { STAGE_ORDER, STAGE_LABEL, type DealStage } from '../../../../lib/crm-constants'

const STAGE_COLOR: Record<DealStage, string> = {
  lead:        '#6B7280',
  qualified:   '#3B4FC4',
  proposal:    '#7C3AED',
  negotiation: '#B35A00',
  won:         '#0F7B6C',
  lost:        '#DC2626',
}

export function DealActions({ id, currentStage }: { id: string; currentStage: DealStage }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function moveToStage(stage: DealStage) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/deals/${id}/stage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Gagal mengubah stage.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  const activeStages = STAGE_ORDER.filter((s) => s !== 'won' && s !== 'lost')
  const terminalStages: DealStage[] = ['won', 'lost']
  const isDone = currentStage === 'won' || currentStage === 'lost'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stage progression bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {activeStages.map((stage) => {
          const active = stage === currentStage
          const past = STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(currentStage) && !terminalStages.includes(currentStage)
          const color = STAGE_COLOR[stage]
          return (
            <button
              key={stage}
              disabled={busy || isDone || stage === currentStage}
              onClick={() => moveToStage(stage)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--r-md)',
                border: `1px solid ${active ? color : past ? color : 'var(--border)'}`,
                background: active ? color : past ? `${color}22` : 'transparent',
                color: active ? 'white' : past ? color : 'var(--fg-3)',
                font: `${active ? '600' : '500'} 12px/1 var(--font-sans)`,
                cursor: busy || isDone || stage === currentStage ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {STAGE_LABEL[stage]}
            </button>
          )
        })}
      </div>

      {/* Won / Lost buttons */}
      {!isDone && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={busy}
            onClick={() => moveToStage('won')}
            style={{ padding: '7px 14px', borderRadius: 'var(--r-md)', border: '1px solid #0F7B6C', background: 'transparent', color: '#0F7B6C', font: '600 12px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}
          >
            Menang
          </button>
          <button
            disabled={busy}
            onClick={() => moveToStage('lost')}
            style={{ padding: '7px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--danger, #DC2626)', background: 'transparent', color: 'var(--danger, #DC2626)', font: '600 12px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}
          >
            Kalah
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
      )}
    </div>
  )
}
