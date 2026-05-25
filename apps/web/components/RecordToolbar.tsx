'use client'

import { useState, useRef, useEffect } from 'react'
import type { ViewFilter, ViewSort } from '../lib/platform/views'

export type { ViewFilter, ViewSort }

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'select'
  options?: string[]
}

export interface SavedView {
  id: string
  name: string
  isDefault: boolean
  isShared: boolean
  filters: ViewFilter[]
  sorts: ViewSort[]
  columns?: string[]
}

export interface RecordToolbarProps {
  modelKey: string
  fields: FieldDef[]
  search: string
  onSearchChange: (v: string) => void
  filters: ViewFilter[]
  onFiltersChange: (f: ViewFilter[]) => void
  sorts: ViewSort[]
  onSortsChange: (s: ViewSort[]) => void
  groupBy: string | null
  onGroupByChange: (g: string | null) => void
  savedViews?: SavedView[]
  activeViewId?: string | null
  onViewSelect?: (id: string | null) => void
  onViewSaved?: (view: SavedView) => void
  onViewDeleted?: (id: string) => void
  totalCount?: number
  visibleCount?: number
}

// ── Operator helpers ─────────────────────────────────────────────────────────

const OPS_BY_TYPE: Record<FieldDef['type'], ViewFilter['op'][]> = {
  text:   ['contains', 'eq', 'ne'],
  number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'],
  date:   ['eq', 'gt', 'gte', 'lt', 'lte'],
  select: ['eq', 'in', 'not_in', 'ne'],
}

const OP_LABELS: Record<ViewFilter['op'], string> = {
  eq:       '=',
  ne:       '≠',
  gt:       '>',
  gte:      '≥',
  lt:       '<',
  lte:      '≤',
  contains: 'mengandung',
  in:       'salah satu dari',
  not_in:   'bukan dari',
}

// ── Small shared styles ──────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  font: '12px var(--font-sans)',
  color: 'var(--fg-2)',
  background: 'var(--bg)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap' as const,
  flexShrink: 0,
}

const popoverStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  zIndex: 200,
  minWidth: 220,
  padding: '6px 0',
}

const inputStyle: React.CSSProperties = {
  height: 28,
  padding: '0 8px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  font: '12px var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg)',
  boxSizing: 'border-box',
  width: '100%',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

// ── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  filter,
  fields,
  onChange,
  onRemove,
}: {
  filter: ViewFilter
  fields: FieldDef[]
  onChange: (f: ViewFilter) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  const field = fields.find(f => f.key === filter.field)
  const label = field?.label ?? filter.field
  const opLabel = OP_LABELS[filter.op] ?? filter.op
  const valueStr = Array.isArray(filter.value) ? (filter.value as string[]).join(', ') : String(filter.value ?? '')

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 6px 0 8px',
          border: '1px solid var(--indigo)',
          borderRadius: 'var(--r-sm)',
          font: '12px var(--font-sans)',
          color: 'var(--indigo)',
          background: 'rgba(59,79,196,0.06)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span onClick={() => setOpen(v => !v)}>
          <strong>{label}</strong> {opLabel} <em style={{ fontStyle: 'normal' }}>{valueStr}</em>
        </span>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--indigo)', padding: '0 2px', lineHeight: 1 }}
        >×</button>
      </div>

      {open && field && (
        <div style={{ ...popoverStyle, minWidth: 240, padding: 10 }}>
          <FilterEditor
            filter={filter}
            field={field}
            onApply={f => { onChange(f); setOpen(false) }}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

// ── Filter editor (used in chip popover and add-filter panel) ────────────────

function FilterEditor({
  filter,
  field,
  onApply,
  onCancel,
}: {
  filter: ViewFilter
  field: FieldDef
  onApply: (f: ViewFilter) => void
  onCancel: () => void
}) {
  const [op, setOp] = useState<ViewFilter['op']>(filter.op)
  const [value, setValue] = useState<string>(
    Array.isArray(filter.value) ? (filter.value as string[]).join(', ') : String(filter.value ?? '')
  )
  const ops = OPS_BY_TYPE[field.type]

  function apply() {
    let finalValue: unknown = value
    if (op === 'in' || op === 'not_in') {
      finalValue = value.split(',').map(s => s.trim()).filter(Boolean)
    } else if (field.type === 'number') {
      finalValue = Number(value)
    }
    onApply({ field: field.key, op, value: finalValue })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        {field.label}
      </div>
      <select value={op} onChange={e => setOp(e.target.value as ViewFilter['op'])} style={selectStyle}>
        {ops.map(o => <option key={o} value={o}>{OP_LABELS[o]}</option>)}
      </select>
      {field.type === 'select' && field.options ? (
        op === 'in' || op === 'not_in' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }}>
            {field.options.map(opt => {
              const selected = value.split(',').map(s => s.trim()).includes(opt)
              return (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, font: '12px var(--font-sans)', color: 'var(--fg-1)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={e => {
                      const current = value.split(',').map(s => s.trim()).filter(Boolean)
                      if (e.target.checked) setValue([...current, opt].join(', '))
                      else setValue(current.filter(s => s !== opt).join(', '))
                    }}
                  />
                  {opt}
                </label>
              )
            })}
          </div>
        ) : (
          <select value={value} onChange={e => setValue(e.target.value)} style={selectStyle}>
            <option value="">— pilih —</option>
            {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )
      ) : field.type === 'date' ? (
        <input type="date" value={value} onChange={e => setValue(e.target.value)} style={inputStyle} />
      ) : field.type === 'number' ? (
        <input type="number" value={value} onChange={e => setValue(e.target.value)} style={inputStyle} />
      ) : (
        <input type="text" value={value} onChange={e => setValue(e.target.value)} style={inputStyle} placeholder="Nilai…" />
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={apply} style={{ ...btnBase, background: 'var(--indigo)', color: 'var(--white)', border: 'none', flex: 1, justifyContent: 'center' }}>
          Terapkan
        </button>
        <button onClick={onCancel} style={{ ...btnBase, flex: 1, justifyContent: 'center' }}>
          Batal
        </button>
      </div>
    </div>
  )
}

// ── AddFilter panel ──────────────────────────────────────────────────────────

function AddFilterPanel({
  fields,
  onAdd,
  onClose,
}: {
  fields: FieldDef[]
  onAdd: (f: ViewFilter) => void
  onClose: () => void
}) {
  const [selectedField, setSelectedField] = useState<FieldDef | null>(null)

  if (selectedField) {
    const defaultOp = OPS_BY_TYPE[selectedField.type][0]!
    return (
      <div style={{ ...popoverStyle, padding: 10, minWidth: 240 }}>
        <button
          onClick={() => setSelectedField(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: '11px var(--font-sans)', color: 'var(--fg-3)', marginBottom: 8, padding: 0 }}
        >
          ← Kembali
        </button>
        <FilterEditor
          filter={{ field: selectedField.key, op: defaultOp, value: '' }}
          field={selectedField}
          onApply={f => { onAdd(f); onClose() }}
          onCancel={onClose}
        />
      </div>
    )
  }

  return (
    <div style={popoverStyle}>
      {fields.map(f => (
        <button
          key={f.key}
          onClick={() => setSelectedField(f)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '7px 12px', background: 'none', border: 'none',
            font: '12px var(--font-sans)', color: 'var(--fg-1)', cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--bg)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none' }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ── Sort panel ───────────────────────────────────────────────────────────────

function SortPanel({
  sorts,
  fields,
  onChange,
  onClose,
}: {
  sorts: ViewSort[]
  fields: FieldDef[]
  onChange: (s: ViewSort[]) => void
  onClose: () => void
}) {
  const [newField, setNewField] = useState(fields[0]?.key ?? '')
  const [newDir, setNewDir] = useState<'asc' | 'desc'>('asc')

  function add() {
    if (!newField) return
    onChange([...sorts, { field: newField, dir: newDir }])
  }

  return (
    <div style={{ ...popoverStyle, minWidth: 260, padding: 10 }}>
      <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Urutan
      </div>
      {sorts.length === 0 && (
        <div style={{ font: '12px var(--font-sans)', color: 'var(--fg-3)', marginBottom: 8 }}>Tidak ada urutan aktif.</div>
      )}
      {sorts.map((s, i) => {
        const field = fields.find(f => f.key === s.field)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ flex: 1, font: '12px var(--font-sans)', color: 'var(--fg-1)' }}>{field?.label ?? s.field}</span>
            <select
              value={s.dir}
              onChange={e => {
                const next = [...sorts]
                next[i] = { ...s, dir: e.target.value as 'asc' | 'desc' }
                onChange(next)
              }}
              style={{ ...selectStyle, width: 80 }}
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
            <button
              onClick={() => onChange(sorts.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
            >×</button>
          </div>
        )
      })}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', gap: 6 }}>
        <select value={newField} onChange={e => setNewField(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
          {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <select value={newDir} onChange={e => setNewDir(e.target.value as 'asc' | 'desc')} style={{ ...selectStyle, width: 80 }}>
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
        <button onClick={add} style={{ ...btnBase, background: 'var(--indigo)', color: 'var(--white)', border: 'none', padding: '0 10px' }}>+</button>
      </div>
    </div>
  )
}

// ── SaveViewPanel ────────────────────────────────────────────────────────────

function SaveViewPanel({
  modelKey,
  filters,
  sorts,
  onSaved,
  onClose,
}: {
  modelKey: string
  filters: ViewFilter[]
  sorts: ViewSort[]
  onSaved: (view: SavedView) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) { setError('Nama wajib diisi.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform/models/${encodeURIComponent(modelKey)}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), filters, sorts, isDefault, isShared }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan.'); return }
      onSaved({
        id: data.view.id,
        name: data.view.name,
        isDefault: data.view.isDefault,
        isShared: data.view.isShared,
        filters: (data.view.filters ?? []) as ViewFilter[],
        sorts: (data.view.sorts ?? []) as ViewSort[],
        columns: data.view.columns ?? [],
      })
      onClose()
    } catch {
      setError('Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ ...popoverStyle, minWidth: 260, padding: 12, right: 0, left: 'auto' }}>
      <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Simpan tampilan
      </div>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nama tampilan…"
        style={inputStyle}
        autoFocus
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, font: '12px var(--font-sans)', color: 'var(--fg-1)', marginTop: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
        Jadikan default saya
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, font: '12px var(--font-sans)', color: 'var(--fg-1)', marginTop: 6, cursor: 'pointer' }}>
        <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} />
        Bagikan ke workspace
      </label>
      {error && (
        <div style={{ font: '11px var(--font-sans)', color: '#c0392b', marginTop: 6 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ ...btnBase, background: 'var(--indigo)', color: 'var(--white)', border: 'none', flex: 1, justifyContent: 'center' }}
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button onClick={onClose} style={{ ...btnBase, flex: 1, justifyContent: 'center' }}>Batal</button>
      </div>
    </div>
  )
}

// ── SavedViews dropdown ───────────────────────────────────────────────────────

function SavedViewsDropdown({
  views,
  activeViewId,
  onSelect,
  onDeleted,
}: {
  views: SavedView[]
  activeViewId?: string | null
  onSelect: (id: string | null) => void
  onDeleted?: (id: string) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function del(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/platform/views/${id}`, { method: 'DELETE' })
      onDeleted?.(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={popoverStyle}>
      <button
        onClick={() => onSelect(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
          padding: '7px 12px', background: 'none', border: 'none',
          font: '12px var(--font-sans)', color: !activeViewId ? 'var(--indigo)' : 'var(--fg-2)', cursor: 'pointer',
        }}
      >
        {!activeViewId && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block' }} />}
        Tanpa tampilan
      </button>
      {views.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />}
      {views.map(v => (
        <div
          key={v.id}
          style={{ display: 'flex', alignItems: 'center', padding: '0 4px 0 12px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <button
            onClick={() => onSelect(v.id)}
            style={{
              flex: 1, textAlign: 'left', background: 'none', border: 'none',
              font: '12px var(--font-sans)', color: activeViewId === v.id ? 'var(--indigo)' : 'var(--fg-1)',
              cursor: 'pointer', padding: '7px 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {activeViewId === v.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block', flexShrink: 0 }} />}
            {v.name}
            {v.isDefault && <span style={{ font: '10px var(--font-sans)', color: 'var(--fg-3)', marginLeft: 2 }}>•default</span>}
          </button>
          <button
            onClick={() => del(v.id)}
            disabled={deleting === v.id}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: '4px 6px', fontSize: 13, lineHeight: 1 }}
          >
            {deleting === v.id ? '…' : '×'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RecordToolbar({
  modelKey,
  fields,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sorts,
  onSortsChange,
  groupBy,
  onGroupByChange,
  savedViews,
  activeViewId,
  onViewSelect,
  onViewSaved,
  onViewDeleted,
  totalCount,
  visibleCount,
}: RecordToolbarProps) {
  const [showAddFilter, setShowAddFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showViews, setShowViews] = useState(false)
  const [showSave, setShowSave] = useState(false)

  const addFilterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const viewsRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLDivElement>(null)

  useClickOutside(addFilterRef, () => setShowAddFilter(false))
  useClickOutside(sortRef, () => setShowSort(false))
  useClickOutside(viewsRef, () => setShowViews(false))
  useClickOutside(saveRef, () => setShowSave(false))

  const hasActiveFilters = filters.length > 0 || search.length > 0

  const countText = totalCount == null
    ? null
    : visibleCount != null && visibleCount !== totalCount
      ? `${visibleCount} / ${totalCount}`
      : `${totalCount}`

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px var(--content-gutter)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none', lineHeight: 1 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
        </span>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Cari…"
          style={{
            ...inputStyle,
            width: 200,
            paddingLeft: 26,
            paddingRight: search ? 26 : 8,
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--fg-3)', fontSize: 14, lineHeight: 1, padding: '0 2px',
            }}
          >×</button>
        )}
      </div>

      {/* Active filter chips */}
      {filters.map((f, i) => (
        <FilterChip
          key={i}
          filter={f}
          fields={fields}
          onChange={updated => {
            const next = [...filters]
            next[i] = updated
            onFiltersChange(next)
          }}
          onRemove={() => onFiltersChange(filters.filter((_, j) => j !== i))}
        />
      ))}

      {/* + Filter */}
      <div ref={addFilterRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowAddFilter(v => !v)}
          style={btnBase}
        >
          + Filter
        </button>
        {showAddFilter && (
          <AddFilterPanel
            fields={fields}
            onAdd={f => onFiltersChange([...filters, f])}
            onClose={() => setShowAddFilter(false)}
          />
        )}
      </div>

      {/* Sort */}
      <div ref={sortRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowSort(v => !v)}
          style={{
            ...btnBase,
            color: sorts.length > 0 ? 'var(--indigo)' : 'var(--fg-2)',
            borderColor: sorts.length > 0 ? 'var(--indigo)' : 'var(--border)',
          }}
        >
          Urutan
          {sorts.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--indigo)', color: 'var(--white)',
              font: '600 10px/1 var(--font-sans)',
            }}>
              {sorts.length}
            </span>
          )}
        </button>
        {showSort && (
          <SortPanel
            sorts={sorts}
            fields={fields}
            onChange={onSortsChange}
            onClose={() => setShowSort(false)}
          />
        )}
      </div>

      {/* Group by */}
      <select
        value={groupBy ?? ''}
        onChange={e => onGroupByChange(e.target.value || null)}
        style={{ ...selectStyle, width: 'auto', flexShrink: 0 }}
      >
        <option value="">Kelompokkan: —</option>
        {fields.map(f => (
          <option key={f.key} value={f.key}>Kelompokkan: {f.label}</option>
        ))}
      </select>

      {/* Saved views */}
      {savedViews !== undefined && onViewSelect && (
        <div ref={viewsRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowViews(v => !v)}
            style={{
              ...btnBase,
              color: activeViewId ? 'var(--indigo)' : 'var(--fg-2)',
              borderColor: activeViewId ? 'var(--indigo)' : 'var(--border)',
            }}
          >
            {activeViewId ? (savedViews.find(v => v.id === activeViewId)?.name ?? 'Tampilan') : 'Tampilan'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 3.5L5 6.5L8 3.5" />
            </svg>
          </button>
          {showViews && (
            <SavedViewsDropdown
              views={savedViews}
              activeViewId={activeViewId}
              onSelect={id => { onViewSelect(id); setShowViews(false) }}
              onDeleted={id => { onViewDeleted?.(id); if (activeViewId === id) onViewSelect(null) }}
            />
          )}
        </div>
      )}

      {/* Save */}
      {modelKey && (
        <div ref={saveRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowSave(v => !v)}
            style={{ ...btnBase }}
            title="Simpan tampilan ini"
          >
            Simpan
          </button>
          {showSave && (
            <SaveViewPanel
              modelKey={modelKey}
              filters={filters}
              sorts={sorts}
              onSaved={view => { onViewSaved?.(view); setShowSave(false) }}
              onClose={() => setShowSave(false)}
            />
          )}
        </div>
      )}

      {/* Spacer + count */}
      <span style={{ flex: 1 }} />
      {countText && (
        <span style={{
          font: '12px var(--font-sans)',
          color: hasActiveFilters ? 'var(--fg-2)' : 'var(--fg-3)',
          flexShrink: 0,
        }}>
          {countText} {totalCount === 1 ? 'baris' : 'baris'}
        </span>
      )}
    </div>
  )
}
