'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ENTITY_COLUMNS, ENTITY_LABEL, type ImportEntity, type ColSpec } from '../../../lib/migration-constants'

const ENTITIES: ImportEntity[] = ['contacts', 'vendors', 'products', 'accounts']

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px',
  border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg-1)', width: '100%', boxSizing: 'border-box',
}

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map((line) => {
    const row: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    row.push(cur.trim())
    return row
  })
}

type Step = 'entity' | 'paste' | 'map' | 'preview' | 'result'

interface ImportResult {
  ok: boolean; jobId: string; totalRows: number; imported: number; failed: number
  errors: { row: number; message: string }[]
}

export function ImportWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('entity')
  const [entity, setEntity] = useState<ImportEntity>('contacts')
  const [csvText, setCsvText] = useState('')
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({}) // colKey → csvHeader
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const cols = ENTITY_COLUMNS[entity]

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => setCsvText(e.target?.result as string ?? '')
    reader.readAsText(file)
  }

  function handleParseCsv() {
    setParseError(null)
    if (!csvText.trim()) return setParseError('Tempel atau unggah file CSV terlebih dahulu.')
    const rows = parseCSV(csvText)
    if (rows.length < 2) return setParseError('CSV harus memiliki baris header dan minimal 1 baris data.')
    const [header, ...data] = rows
    setParsedHeaders(header!)
    setParsedRows(data)
    // Auto-map: match header name to col key (case-insensitive)
    const auto: Record<string, string> = {}
    for (const col of cols) {
      const match = header!.find((h) =>
        h.toLowerCase().replace(/\s+/g, '') === col.key.toLowerCase() ||
        h.toLowerCase() === col.label.toLowerCase(),
      )
      if (match) auto[col.key] = match
    }
    setMapping(auto)
    setStep('map')
  }

  function buildRows(): Record<string, string>[] {
    return parsedRows.map((row) => {
      const obj: Record<string, string> = {}
      for (const col of cols) {
        const header = mapping[col.key]
        if (header) {
          const idx = parsedHeaders.indexOf(header)
          obj[col.key] = idx >= 0 ? (row[idx] ?? '') : ''
        }
      }
      return obj
    })
  }

  async function runImport() {
    setSubmitting(true)
    const rows = buildRows()
    const res = await fetch('/api/mig/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entity, rows }),
    })
    const j: ImportResult = await res.json()
    setResult(j)
    setStep('result')
    setSubmitting(false)
    router.refresh()
  }

  function reset() {
    setStep('entity'); setCsvText(''); setParsedHeaders([]); setParsedRows([])
    setMapping({}); setResult(null); setParseError(null)
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Step tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {(['entity','paste','map','preview','result'] as Step[]).map((s, i) => {
          const labels = ['1. Entitas', '2. Data CSV', '3. Pemetaan', '4. Preview', '5. Hasil']
          const active = step === s
          const done = (['entity','paste','map','preview','result'] as Step[]).indexOf(step) > i
          return (
            <div key={s} style={{
              padding: '10px 14px', font: `${active ? '600' : '500'} 12px/1 var(--font-sans)`,
              color: active ? 'var(--indigo)' : done ? 'var(--fg-2)' : 'var(--fg-3)',
              borderBottom: active ? '2px solid var(--indigo)' : '2px solid transparent',
              marginBottom: -1,
            }}>{labels[i]}</div>
          )
        })}
      </div>

      <div style={{ padding: 'var(--s-4)' }}>

        {/* Step 1: Choose entity */}
        {step === 'entity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>Pilih jenis data yang ingin diimpor:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-2)' }}>
              {ENTITIES.map((e) => (
                <button key={e} type="button" onClick={() => setEntity(e)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--r-md)', textAlign: 'left',
                    border: `2px solid ${entity === e ? 'var(--indigo)' : 'var(--border)'}`,
                    background: entity === e ? 'var(--indigo-light, #eef0ff)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}>
                  <div style={{ font: '600 13px/1 var(--font-sans)', color: entity === e ? 'var(--indigo)' : 'var(--fg-1)' }}>{ENTITY_LABEL[e]}</div>
                  <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
                    {ENTITY_COLUMNS[e].map((c) => c.label).join(', ')}
                  </div>
                </button>
              ))}
            </div>
            <div>
              <button type="button" onClick={() => setStep('paste')}
                style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer' }}>
                Lanjut →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Paste / upload CSV */}
        {step === 'paste' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {/* Template hint */}
            <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--bg)', border: '1px solid var(--border)', font: '12px/1.5 var(--font-mono, monospace)', color: 'var(--fg-2)' }}>
              <strong>Header CSV yang diharapkan:</strong><br />
              {ENTITY_COLUMNS[entity].map((c) => c.key).join(',')}<br />
              <span style={{ color: 'var(--fg-3)' }}>
                {ENTITY_COLUMNS[entity].filter((c) => c.hint).map((c) => `${c.key}: ${c.hint}`).join(' · ')}
              </span>
            </div>

            <div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', font: '12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
                Unggah file CSV
              </button>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Tempel CSV di sini…\nContoh:\n${ENTITY_COLUMNS[entity].map((c) => c.key).join(',')}\nContoh Baris 1,...`}
              rows={10}
              style={{ ...inputStyle, height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}
            />

            {parseError && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--red, #c33)' }}>{parseError}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep('entity')}
                style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', font: '600 13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
                ← Kembali
              </button>
              <button type="button" onClick={handleParseCsv}
                style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer' }}>
                Analisis CSV →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Column mapping */}
        {step === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
              Cocokkan kolom CSV ({parsedRows.length} baris data) ke kolom sistem:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              {cols.map((col) => (
                <div key={col.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'center' }}>
                  <div>
                    <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{col.label}</span>
                    {col.required && <span style={{ color: 'var(--danger,#c33)', marginLeft: 2 }}>*</span>}
                    {col.hint && <div style={{ font: '10px/1.3 var(--font-sans)', color: 'var(--fg-3)' }}>{col.hint}</div>}
                  </div>
                  <select style={inputStyle} value={mapping[col.key] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [col.key]: e.target.value }))}>
                    <option value="">— Tidak dipetakan —</option>
                    {parsedHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep('paste')}
                style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', font: '600 13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
                ← Kembali
              </button>
              <button type="button" onClick={() => setStep('preview')}
                style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer' }}>
                Preview →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
              Preview {Math.min(parsedRows.length, 5)} dari {parsedRows.length} baris. Klik Impor untuk melanjutkan.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
                <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>#</th>
                    {cols.filter((c) => mapping[c.key]).map((c) => (
                      <th key={c.key} style={{ padding: '8px 10px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildRows().slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--fg-3)' }}>{i + 1}</td>
                      {cols.filter((c) => mapping[c.key]).map((c) => (
                        <td key={c.key} style={{ padding: '8px 10px', color: 'var(--fg-1)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row[c.key] || <span style={{ color: 'var(--fg-3)' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep('map')}
                style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', font: '600 13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
                ← Kembali
              </button>
              <button type="button" onClick={runImport} disabled={submitting}
                style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'var(--teal, #0F7B6C)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Mengimpor…' : `Impor ${parsedRows.length} Baris`}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <div style={{
              padding: '16px 20px', borderRadius: 'var(--r-md)',
              background: result.failed === 0 ? '#f0fdf4' : result.imported === 0 ? '#fee' : '#fef3cd',
              border: `1px solid ${result.failed === 0 ? '#86efac' : result.imported === 0 ? '#fca5a5' : '#f0c040'}`,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                {result.failed === 0 ? '✓ Impor berhasil!' : result.imported === 0 ? '✗ Impor gagal' : '⚠ Impor selesai dengan sebagian error'}
              </div>
              <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', display: 'flex', gap: 20 }}>
                <span>Total: <strong>{result.totalRows}</strong></span>
                <span style={{ color: 'var(--teal)' }}>Berhasil: <strong>{result.imported}</strong></span>
                {result.failed > 0 && <span style={{ color: 'var(--danger,#c33)' }}>Gagal: <strong>{result.failed}</strong></span>}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Error per baris</div>
                {result.errors.slice(0, 20).map((e) => (
                  <div key={e.row} style={{ font: '12px/1.4 var(--font-mono, monospace)', color: 'var(--danger,#c33)' }}>
                    Baris {e.row}: {e.message}
                  </div>
                ))}
              </div>
            )}

            <div>
              <button type="button" onClick={reset}
                style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer' }}>
                Impor Data Lain
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
