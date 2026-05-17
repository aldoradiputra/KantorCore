'use client'

const PHASE_COLORS: Record<number, string> = {
  0: 'var(--navy)',
  1: 'var(--indigo)',
  2: 'var(--teal)',
  3: 'var(--amber)',
}

const PHASE_BG: Record<number, string> = {
  0: 'var(--indigo-light)',
  1: 'var(--indigo-light)',
  2: 'var(--teal-light)',
  3: 'var(--amber-light)',
}

export type Filters = {
  search: string
  phases: number[]
  statuses: string[]
  types: string[]
}

type Props = {
  filters: Filters
  onChange: (f: Filters) => void
  total: number
  visible: number
}

const ALL_PHASES = [1, 2, 3]
const ALL_STATUSES = ['planned', 'in-progress', 'done']
const ALL_TYPES = ['module', 'app', 'feature', 'infrastructure']

export default function SearchFilterBar({ filters, onChange, total, visible }: Props) {
  function togglePhase(p: number) {
    const next = filters.phases.includes(p)
      ? filters.phases.filter(x => x !== p)
      : [...filters.phases, p]
    onChange({ ...filters, phases: next })
  }

  function toggleStatus(s: string) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter(x => x !== s)
      : [...filters.statuses, s]
    onChange({ ...filters, statuses: next })
  }

  function toggleType(t: string) {
    const next = filters.types.includes(t)
      ? filters.types.filter(x => x !== t)
      : [...filters.types, t]
    onChange({ ...filters, types: next })
  }

  const isFiltered = filters.search || filters.phases.length < ALL_PHASES.length ||
    filters.statuses.length < ALL_STATUSES.length || filters.types.length < ALL_TYPES.length

  function reset() {
    onChange({ search: '', phases: ALL_PHASES, statuses: ALL_STATUSES, types: ALL_TYPES })
  }

  return (
    <div style={{
      padding: '12px 32px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--white)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flexShrink: 0,
    }}>
      {/* Search row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', fontSize: 13, pointerEvents: 'none',
          }}>⌕</span>
          <input
            type="text"
            placeholder="Search features, apps, modules…"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            style={{
              width: '100%',
              paddingLeft: 28,
              paddingRight: 10,
              paddingTop: 7,
              paddingBottom: 7,
              fontSize: 13,
              border: '1.5px solid var(--border)',
              borderRadius: 6,
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--slate)',
              background: 'var(--bg)',
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {isFiltered ? `${visible} of ${total}` : `${total} items`}
        </span>
        {isFiltered && (
          <button onClick={reset} style={{
            fontSize: 11, color: 'var(--indigo)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '2px 6px',
            fontFamily: 'inherit',
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Filter pills row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Phase */}
        <FilterGroup label="Phase">
          {ALL_PHASES.map(p => (
            <Pill
              key={p}
              label={`Phase ${p}`}
              active={filters.phases.includes(p)}
              color={PHASE_COLORS[p]}
              bg={PHASE_BG[p]}
              onClick={() => togglePhase(p)}
            />
          ))}
        </FilterGroup>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* Status */}
        <FilterGroup label="Status">
          {ALL_STATUSES.map(s => (
            <Pill
              key={s}
              label={s}
              active={filters.statuses.includes(s)}
              onClick={() => toggleStatus(s)}
            />
          ))}
        </FilterGroup>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* Type */}
        <FilterGroup label="Type">
          {ALL_TYPES.map(t => (
            <Pill
              key={t}
              label={t}
              active={filters.types.includes(t)}
              onClick={() => toggleType(t)}
            />
          ))}
        </FilterGroup>
      </div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Pill({ label, active, color, bg, onClick }: {
  label: string
  active: boolean
  color?: string
  bg?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 20,
        border: '1.5px solid',
        borderColor: active ? (color || 'var(--slate)') : 'var(--border)',
        background: active ? (bg || 'var(--border)') : 'transparent',
        color: active ? (color || 'var(--slate)') : 'var(--muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}
