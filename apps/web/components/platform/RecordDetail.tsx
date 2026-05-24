import Link from 'next/link'
import { getRecord } from '../../lib/platform/records'
import { getModel, listFields, type FieldDefinition } from '../../lib/platform/registry'
import { getLayout, type DetailLayout, type DetailBlock } from '../../lib/platform/layouts'
import { RecordActions } from './RecordActions'

function formatValue(typeKey: string | undefined, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—'
  if (typeKey === 'bool') return raw ? 'Ya' : 'Tidak'
  if (typeKey === 'currency' || typeKey === 'number') {
    return 'Rp ' + Number(raw).toLocaleString('id-ID')
  }
  if (typeKey === 'date') return String(raw).slice(0, 10)
  return String(raw)
}

export async function RecordDetail({
  modelKey,
  id,
  tenantId,
}: {
  modelKey: string
  id: string
  tenantId: string
}) {
  const def = await getModel(modelKey)
  if (!def) return <div>Model tidak dikenal: {modelKey}</div>
  const [record, layout, fields] = await Promise.all([
    getRecord(tenantId, modelKey, id),
    getLayout<DetailLayout>(modelKey, 'detail', tenantId),
    listFields(modelKey, tenantId),
  ])
  if (!record) return <div>Record tidak ditemukan.</div>

  const fieldByKey = new Map(fields.map((f) => [f.key, f]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 720 }}>
      <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
        <Link href={`/r/${encodeURIComponent(modelKey)}`} style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
          ← {def.model.labelPlural}
        </Link>
      </div>

      {layout.map((block, i) => (
        <Block key={i} block={block} record={record} fields={fields} fieldByKey={fieldByKey} />
      ))}

      <RecordActions modelKey={modelKey} id={id} />
    </div>
  )
}

function Block({
  block,
  record,
  fields,
  fieldByKey,
}: {
  block: DetailBlock
  record: Record<string, unknown> & { custom: Record<string, unknown> }
  fields: FieldDefinition[]
  fieldByKey: Map<string, FieldDefinition>
}) {
  if (block.type === 'header') {
    const titleField = fieldByKey.get(block.title_field)
    const title = formatValue(titleField?.typeKey, (record as Record<string, unknown>)[titleField?.columnName ?? block.title_field])
    const subtitleField = block.subtitle_field ? fieldByKey.get(block.subtitle_field) : undefined
    const subtitle = subtitleField
      ? formatValue(subtitleField.typeKey, (record as Record<string, unknown>)[subtitleField.columnName ?? block.subtitle_field!])
      : null
    return (
      <header>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{title}</h1>
        {subtitle && subtitle !== '—' && (
          <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', marginTop: 4 }}>{subtitle}</div>
        )}
      </header>
    )
  }
  if (block.type === 'fields') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
        {block.fields.map((key) => {
          const f = fieldByKey.get(key)
          if (!f) return null
          const v = formatValue(f.typeKey, (record as Record<string, unknown>)[f.columnName ?? key])
          return <Row key={key} label={f.label} value={v} />
        })}
      </div>
    )
  }
  if (block.type === 'custom_fields') {
    const customFields = fields.filter((f) => !f.isSystem)
    if (!customFields.length) return null
    return (
      <div>
        <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Field Kustom
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
          {customFields.map((f) => (
            <Row key={f.id} label={f.label} value={formatValue(f.typeKey, record.custom[f.key])} />
          ))}
        </div>
      </div>
    )
  }
  return null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</div>
    </div>
  )
}
