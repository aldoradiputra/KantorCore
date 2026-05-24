'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FieldRow, FieldType } from '@kantorcore/db'

export default function ModelFieldsPanel({
  modelKey,
  fields: initial,
  fieldTypes,
}: {
  modelKey: string
  fields: FieldRow[]
  fieldTypes: FieldType[]
}) {
  const router = useRouter()
  const [fields, setFields] = useState<FieldRow[]>(initial)
  const [creating, setCreating] = useState(false)

  async function onCreated(row: FieldRow) {
    setFields((prev) => [...prev, row].sort((a, b) => a.displayOrder - b.displayOrder))
    setCreating(false)
    router.refresh()
  }

  async function onDelete(id: string) {
    if (!confirm('Hapus field kustom ini? Nilai yang sudah tersimpan akan ikut hilang.')) return
    const res = await fetch(`/api/platform/fields/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFields((prev) => prev.filter((f) => f.id !== id))
      router.refresh()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
        <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
          {fields.length} field
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{ height: 32, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: 'pointer' }}
        >
          + Field Kustom
        </button>
      </div>

      {creating && (
        <CreateFieldForm
          modelKey={modelKey}
          fieldTypes={fieldTypes}
          onCreated={onCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
          <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              {['Key', 'Label', 'Tipe', 'Wajib', 'Sumber', ''].map((h) => (
                <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', font: '12px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{f.key}</td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-1)' }}>{f.label}</td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-2)' }}>
                  {fieldTypes.find((t) => t.key === f.typeKey)?.label ?? f.typeKey}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-2)' }}>
                  {f.isRequired ? '✓' : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', padding: '3px 7px', borderRadius: 999,
                    color: f.isSystem ? 'var(--indigo)' : 'var(--teal)',
                    border: `1px solid ${f.isSystem ? 'var(--indigo)' : 'var(--teal)'}`,
                  }}>
                    {f.isSystem ? 'Sistem' : 'Kustom'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  {!f.isSystem && (
                    <button
                      onClick={() => onDelete(f.id)}
                      style={{ height: 26, padding: '0 10px', border: '1px solid rgba(179,90,0,0.3)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--amber)', cursor: 'pointer' }}
                    >
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateFieldForm({
  modelKey,
  fieldTypes,
  onCreated,
  onCancel,
}: {
  modelKey: string
  fieldTypes: FieldType[]
  onCreated: (row: FieldRow) => void
  onCancel: () => void
}) {
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [typeKey, setTypeKey] = useState(fieldTypes[0]?.key ?? 'text')
  const [isRequired, setIsRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!key.trim() || !label.trim()) {
      setError('Key dan label wajib diisi.'); return
    }
    setSaving(true); setError(null)
    const res = await fetch('/api/platform/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelKey, key: key.trim(), label: label.trim(), typeKey, isRequired }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.field) {
      onCreated(data.field)
    } else {
      setError(data.error ?? 'Gagal menyimpan field.')
    }
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--indigo)', borderRadius: 'var(--r-md)', padding: 'var(--s-4)', marginBottom: 'var(--s-3)' }}>
      <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 'var(--s-3)' }}>
        Field Kustom Baru
      </div>
      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)', marginBottom: 'var(--s-3)' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Key (a-z, _ ,0-9)">
          <input value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} placeholder="plat_kendaraan" style={inputStyle} />
        </Field>
        <Field label="Label">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Plat Kendaraan" style={inputStyle} />
        </Field>
        <Field label="Tipe">
          <select value={typeKey} onChange={(e) => setTypeKey(e.target.value)} style={inputStyle}>
            {fieldTypes.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Wajib diisi">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34 }}>
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
            <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Wajib</span>
          </label>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s-3)' }}>
        <button onClick={save} disabled={saving} style={{ height: 32, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Menyimpan…' : 'Buat Field'}
        </button>
        <button onClick={onCancel} style={{ height: 32, padding: '0 12px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
          Batal
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', background: 'var(--bg)',
  font: '400 13px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none',
}
