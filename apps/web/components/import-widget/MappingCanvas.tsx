'use client'
import { useState } from 'react'
import type { FieldMapping, TargetField, MatchType } from './types'

const MATCH_BADGE: Record<MatchType, { label: string; color: string }> = {
  exact: { label: 'Exact Match',  color: 'var(--teal)' },
  ai:    { label: 'AI Match',     color: 'var(--indigo)' },
  manual:{ label: 'Manual',       color: 'var(--amber)' },
  none:  { label: 'Unmapped',     color: 'var(--fg-3)' },
}

export function MappingCanvas({
  mappings: initial,
  targetFields,
  onChange,
}: {
  mappings: FieldMapping[]
  targetFields: TargetField[]
  onChange: (mappings: FieldMapping[]) => void
}) {
  const [mappings, setMappings] = useState<FieldMapping[]>(initial)

  function updateMapping(sourceHeader: string, targetField: string | null) {
    const next = mappings.map((m) =>
      m.sourceHeader === sourceHeader
        ? { ...m, targetField, matchType: 'manual' as MatchType, confidence: undefined }
        : m
    )
    setMappings(next)
    onChange(next)
  }

  const usedTargets = new Set(mappings.map((m) => m.targetField).filter(Boolean))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', gap: 12 }}>
        <span>Source Column</span>
        <span>Target Field</span>
        <span>Status</span>
      </div>

      {/* Rows */}
      {mappings.map((m, i) => {
        const badge = MATCH_BADGE[m.matchType]
        const isRequired = targetFields.find((f) => f.name === m.targetField)?.required
        const isMissing = !m.targetField

        return (
          <div key={m.sourceHeader} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: 12,
            padding: '10px 14px', alignItems: 'center',
            borderBottom: i < mappings.length - 1 ? '1px solid var(--border)' : 'none',
            background: isMissing && isRequired ? '#fff5f5' : 'transparent',
          }}>
            {/* Source */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--fg-3)', fontSize: 14, cursor: 'grab' }}>⠿</span>
              <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>
                {m.sourceHeader}
              </span>
            </div>

            {/* Target select */}
            <select
              value={m.targetField ?? ''}
              onChange={(e) => updateMapping(m.sourceHeader, e.target.value || null)}
              style={{
                height: 32, padding: '0 8px', border: `1px solid ${isMissing ? '#fca5a5' : 'var(--border-strong)'}`,
                borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)',
                color: 'var(--fg-1)', background: 'var(--bg-1)', width: '100%',
              }}
            >
              <option value="">— Tidak dipetakan —</option>
              {targetFields.map((f) => (
                <option
                  key={f.name}
                  value={f.name}
                  disabled={usedTargets.has(f.name) && m.targetField !== f.name}
                >
                  {f.name}{f.required ? ' *' : ''}  [{f.type}]
                </option>
              ))}
            </select>

            {/* Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '3px 8px', borderRadius: 999, font: '600 10px/1 var(--font-sans)',
                color: badge.color, border: `1px solid ${badge.color}`, whiteSpace: 'nowrap',
              }}>
                {badge.label}
                {m.matchType === 'ai' && m.confidence !== undefined && ` ${Math.round(m.confidence * 100)}%`}
              </span>
            </div>
          </div>
        )
      })}

      {/* Required field check */}
      {(() => {
        const unmappedRequired = targetFields.filter(
          (f) => f.required && !mappings.some((m) => m.targetField === f.name)
        )
        if (unmappedRequired.length === 0) return null
        return (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: '#fff5f5', font: '12px/1.4 var(--font-sans)', color: '#c0392b' }}>
            <strong>Field wajib belum dipetakan:</strong> {unmappedRequired.map((f) => f.name).join(', ')}
          </div>
        )
      })()}
    </div>
  )
}
