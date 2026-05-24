import Link from 'next/link'
import { listRecords } from '../../lib/platform/records'
import { getModel, listFields } from '../../lib/platform/registry'
import { getLayout, type ListLayout } from '../../lib/platform/layouts'
import { listViews, getView, getDefaultView, buildViewSql } from '../../lib/platform/views'
import { SaveViewButton, DeleteViewButton } from './SaveViewButton'

function formatValue(typeKey: string | undefined, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—'
  if (typeKey === 'bool') return raw ? '✓' : '—'
  if (typeKey === 'currency' || typeKey === 'number') {
    return 'Rp ' + Number(raw).toLocaleString('id-ID')
  }
  if (typeKey === 'date') return String(raw).slice(0, 10)
  return String(raw)
}

export async function RecordList({
  modelKey,
  tenantId,
  viewId,
}: {
  modelKey: string
  tenantId: string
  viewId?: string
}) {
  const def = await getModel(modelKey, tenantId)
  if (!def) return <div>Model tidak dikenal: {modelKey}</div>

  const [layout, fields, allViews, selectedView] = await Promise.all([
    getLayout<ListLayout>(modelKey, 'list', tenantId),
    listFields(modelKey, tenantId),
    listViews(tenantId, modelKey),
    viewId ? getView(tenantId, viewId) : getDefaultView(tenantId, modelKey),
  ])

  const { whereSql, orderSql } = buildViewSql(selectedView)
  const rows = await listRecords(tenantId, modelKey, { limit: 200, whereSql, orderSql })

  const fieldByKey = new Map(fields.map((f) => [f.key, f]))
  const cols = (selectedView?.columns && selectedView.columns.length > 0
    ? selectedView.columns
    : layout.columns) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s-3)' }}>
        <h2 style={{ margin: 0 }}>{def.model.labelPlural}</h2>
        <Link
          href={`/r/${encodeURIComponent(modelKey)}/new`}
          style={{
            height: 34, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)',
            border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/34px var(--font-sans)',
            cursor: 'pointer', textDecoration: 'none',
          }}
        >
          + {def.model.label} Baru
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          View:
        </span>
        <Link
          href={`/r/${encodeURIComponent(modelKey)}`}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            font: '12px/1 var(--font-sans)',
            color: !selectedView ? 'var(--white)' : 'var(--fg-2)',
            background: !selectedView ? 'var(--indigo)' : 'var(--surface)',
            textDecoration: 'none',
          }}
        >
          Default
        </Link>
        {allViews.map((v) => (
          <div key={v.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Link
              href={`/r/${encodeURIComponent(modelKey)}?view=${v.id}`}
              style={{
                padding: '5px 10px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                font: '12px/1 var(--font-sans)',
                color: selectedView?.id === v.id ? 'var(--white)' : 'var(--fg-2)',
                background: selectedView?.id === v.id ? 'var(--indigo)' : 'var(--surface)',
                textDecoration: 'none',
              }}
            >
              {v.name}{v.isDefault ? ' ★' : ''}
            </Link>
            {selectedView?.id === v.id && <DeleteViewButton viewId={v.id} />}
          </div>
        ))}
        <SaveViewButton modelKey={modelKey} currentColumns={cols} />
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
          <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
            Belum ada {def.model.label.toLowerCase()}.
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {cols.map((c) => (
                  <th key={c} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                    {fieldByKey.get(c)?.label ?? c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} style={{ borderBottom: '1px solid var(--border)' }}>
                  {cols.map((c, i) => {
                    const f = fieldByKey.get(c)
                    const v = formatValue(f?.typeKey, (row as Record<string, unknown>)[f?.columnName ?? c])
                    return (
                      <td key={c} style={{ padding: '10px 14px', color: i === 0 ? 'var(--fg-1)' : 'var(--fg-2)' }}>
                        {i === 0 ? (
                          <Link href={`/r/${encodeURIComponent(modelKey)}/${row.id}`} style={{ color: 'var(--fg-1)', textDecoration: 'none' }}>
                            {v}
                          </Link>
                        ) : v}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
