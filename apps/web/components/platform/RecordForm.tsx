'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FieldRow } from '@kantorcore/db'

type Mode = 'create' | 'edit'

interface Props {
  modelKey: string
  fields: FieldRow[]
  initialSystem?: Record<string, unknown>
  initialCustom?: Record<string, unknown>
  recordId?: string
  mode: Mode
}

export default function RecordForm({
  modelKey,
  fields,
  initialSystem = {},
  initialCustom = {},
  recordId,
  mode,
}: Props) {
  const router = useRouter()
  const [system, setSystem] = useState<Record<string, unknown>>(initialSystem)
  const [custom, setCustom] = useState<Record<string, unknown>>(initialCustom)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const systemFields = fields.filter((f) => f.isSystem)
  const customFields = fields.filter((f) => !f.isSystem)

  function update(field: FieldRow, value: unknown) {
    const setter = field.isSystem ? setSystem : setCustom
    setter((prev) => ({ ...prev, [field.key]: value }))
  }

  async function submit() {
    setSaving(true); setError(null)
    const url = mode === 'create'
      ? `/api/records/${encodeURIComponent(modelKey)}`
      : `/api/records/${encodeURIComponent(modelKey)}/${recordId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: system, custom }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.record) {
      router.push(`/r/${encodeURIComponent(modelKey)}/${data.record.id}`)
      router.refresh()
    } else {
      setError(data.error ?? 'Gagal menyimpan.')
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)' }}>
          {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
        {systemFields.map((f) => (
          <FieldInput key={f.id} field={f} value={system[f.key]} onChange={(v) => update(f, v)} />
        ))}
      </section>

      {customFields.length > 0 && (
        <section>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Field Kustom
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
            {customFields.map((f) => (
              <FieldInput key={f.id} field={f} value={custom[f.key]} onChange={(v) => update(f, v)} />
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={submit}
          disabled={saving}
          style={{ height: 36, padding: '0 18px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? 'Menyimpan…' : mode === 'create' ? 'Buat' : 'Simpan Perubahan'}
        </button>
        <button
          onClick={() => router.back()}
          style={{ height: 36, padding: '0 14px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}
        >
          Batal
        </button>
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldRow
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = (
    <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {field.label}{field.isRequired ? ' *' : ''}
    </span>
  )
  const wrap = (input: React.ReactNode) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label}
      {input}
    </label>
  )

  if (field.typeKey === 'longtext') {
    return wrap(
      <textarea
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
      />,
    )
  }
  if (field.typeKey === 'bool') {
    return wrap(
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34 }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
          {field.helpText ?? 'Ya'}
        </span>
      </label>,
    )
  }
  if (field.typeKey === 'date') {
    return wrap(
      <input
        type="date"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />,
    )
  }
  if (field.typeKey === 'number' || field.typeKey === 'currency') {
    return wrap(
      <input
        type="number"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        style={inputStyle}
      />,
    )
  }
  // text, email, phone, select (no options yet → free input)
  return wrap(
    <input
      type={field.typeKey === 'email' ? 'email' : 'text'}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />,
  )
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', background: 'var(--bg)',
  font: '400 13px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
