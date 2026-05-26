'use client'
import type { RowError } from './types'

export function PreviewGrid({
  headers,
  rows,
  errors,
}: {
  headers: string[]
  rows: Record<string, string>[]
  errors: RowError[]
}) {
  // Build error lookup: rowIndex → field → message
  const errMap = new Map<string, string>()
  for (const e of errors) {
    errMap.set(`${e.row}:${e.field}`, e.message)
  }

  // Map target field name back to source header using errors
  // errors have field = targetField name, but we're showing source headers
  // So highlight entire row if it has errors
  const rowsWithErrors = new Set(errors.map((e) => e.row))

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
        <thead>
          <tr style={{ background: 'var(--surface)' }}>
            <th style={{ ...thStyle, color: 'var(--fg-3)', width: 40 }}>#</th>
            {headers.map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rowNum = i + 2  // row 1 = headers
            const hasError = rowsWithErrors.has(rowNum)
            return (
              <tr key={i} style={{ background: hasError ? '#fff5f5' : i % 2 === 0 ? 'var(--bg-1)' : 'var(--surface)' }}>
                <td style={{ ...tdStyle, color: 'var(--fg-3)', textAlign: 'center' }}>{rowNum}</td>
                {headers.map((h) => (
                  <td key={h} style={{ ...tdStyle, color: 'var(--fg-1)' }}>{row[h] ?? ''}</td>
                ))}
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr><td colSpan={headers.length + 1} style={{ ...tdStyle, textAlign: 'center', color: 'var(--fg-3)' }}>Tidak ada data</td></tr>
          )}
        </tbody>
      </table>

      {errors.length > 0 && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: '#fff5f5' }}>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Error ({errors.length})
          </div>
          {errors.slice(0, 20).map((e, i) => (
            <div key={i} style={{ font: '12px/1.6 var(--font-sans)', color: '#c0392b' }}>
              Row {e.row}: <strong>[{e.value || '(empty)'}]</strong> → {e.message}
            </div>
          ))}
          {errors.length > 20 && (
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              …and {errors.length - 20} more errors
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', font: '600 11px/1 var(--font-sans)',
  color: 'var(--fg-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '6px 10px', borderBottom: '1px solid var(--border)', maxWidth: 200,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
