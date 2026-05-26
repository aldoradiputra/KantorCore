'use client'
import { useState } from 'react'
import type { ImportConfig } from './types'

const inp: React.CSSProperties = {
  height: 32, padding: '0 8px', border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)', background: 'var(--bg-1)', width: '100%', boxSizing: 'border-box',
}

export function ConfigDrawer({
  filename,
  sheets,
  config: initial,
  onChange,
}: {
  filename: string
  sheets?: string[]
  config: ImportConfig
  onChange: (config: ImportConfig) => void
}) {
  const [config, setConfig] = useState<ImportConfig>(initial)
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  function update(patch: Partial<ImportConfig>) {
    const next = { ...config, ...patch }
    setConfig(next)
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Konfigurasi File
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s-3)' }}>
        {/* Sheet selector — xlsx only */}
        {(ext === 'xlsx' || ext === 'xls') && sheets && sheets.length > 1 && (
          <Field label="Sheet">
            <select style={inp} value={config.sheetIndex ?? 0} onChange={(e) => update({ sheetIndex: Number(e.target.value) })}>
              {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
            </select>
          </Field>
        )}

        {/* Delimiter — CSV only */}
        {ext === 'csv' && (
          <Field label="Delimiter">
            <select style={inp} value={config.delimiter ?? ','} onChange={(e) => update({ delimiter: e.target.value })}>
              <option value=",">, (Comma)</option>
              <option value=";">; (Semicolon)</option>
              <option value={'\t'}>Tab</option>
              <option value="|">| (Pipe)</option>
            </select>
          </Field>
        )}

        {/* Encoding */}
        <Field label="Encoding">
          <select style={inp} value={config.encoding ?? 'utf-8'} onChange={(e) => update({ encoding: e.target.value })}>
            <option value="utf-8">UTF-8</option>
            <option value="utf-16">UTF-16</option>
            <option value="iso-8859-1">ISO-8859-1</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
        </Field>

        {/* Date format */}
        <Field label="Format Tanggal">
          <select style={inp} value={config.dateFormat ?? 'auto'} onChange={(e) => update({ dateFormat: e.target.value })}>
            <option value="auto">Auto-detect</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{label}</span>
      {children}
    </label>
  )
}
