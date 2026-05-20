'use client'

import { useState, useRef } from 'react'
import type { Project, IssueStatus, IssuePriority } from '@kantorcore/db'

interface IssueRow {
  issue: {
    id: string
    number: number
    title: string
    body: string | null
    status: IssueStatus
    priority: IssuePriority
    assigneeId: string | null
    createdAt: string
  }
  assignee: { id: string; name: string; email: string } | null
  creator: { id: string; name: string; email: string }
}

const STATUS_COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status: 'backlog',     label: 'Backlog',            color: 'var(--fg-3)' },
  { status: 'todo',        label: 'To Do',              color: 'var(--fg-3)' },
  { status: 'in_progress', label: 'Sedang Dikerjakan',  color: 'var(--indigo)' },
  { status: 'in_review',   label: 'Review',             color: 'var(--amber)' },
  { status: 'done',        label: 'Selesai',            color: 'var(--teal)' },
  { status: 'cancelled',   label: 'Dibatalkan',         color: 'var(--fg-3)' },
]

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  none: '—', low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak',
}

const PRIORITY_STRIPE: Record<IssuePriority, string> = {
  none:   'transparent',
  low:    'rgba(15,123,108,0.4)',  // --teal 40%
  medium: 'var(--indigo)',
  high:   'var(--amber)',
  urgent: '#C13D3D',
}

const PRIORITY_COLOR: Record<IssuePriority, string> = {
  none: 'var(--fg-3)', low: 'var(--teal)', medium: 'var(--indigo)',
  high: 'var(--amber)', urgent: '#C13D3D',
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default function ProjectBoard({
  project,
  currentUserId,
  initialIssues,
  members,
}: {
  project: Project
  currentUserId: string
  initialIssues: unknown[]
  members: { id: string; name: string; email: string }[]
}) {
  const [issues, setIssues] = useState<IssueRow[]>(() =>
    (initialIssues as IssueRow[]).map((r) => ({
      ...r,
      issue: { ...r.issue, createdAt: String(r.issue.createdAt) },
    })),
  )
  const [view, setView] = useState<'list' | 'board'>('board')
  const [creatingTitle, setCreatingTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCardId, setNewCardId] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch(`/api/proj/projects/${project.id}/issues`)
    if (!res.ok) return
    const data = (await res.json()) as { issues: IssueRow[] }
    setIssues(data.issues)
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const title = creatingTitle.trim()
    if (!title || creating) return
    setCreating(true)
    setError(null)
    const res = await fetch(`/api/proj/projects/${project.id}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const data = (await res.json()) as { issue?: { id: string } }
      setCreatingTitle('')
      await refresh()
      if (data.issue?.id) {
        setNewCardId(data.issue.id)
        setTimeout(() => setNewCardId(null), 600)
      }
    } else {
      const data = await res.json().catch(() => ({ error: 'Gagal membuat issue.' }))
      setError(data.error ?? 'Gagal membuat issue.')
    }
    setCreating(false)
  }

  async function patchIssue(id: string, patch: Record<string, unknown>) {
    setIssues((prev) =>
      prev.map((r) => (r.issue.id === id ? { ...r, issue: { ...r.issue, ...patch } } : r)),
    )
    const res = await fetch(`/api/proj/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) await refresh()
  }

  const grouped = STATUS_COLUMNS.map(({ status, label, color }) => ({
    status, label, color,
    rows: issues.filter((r) => r.issue.status === status),
  }))

  return (
    <>
      {/* Toolbar */}
      <div style={{
        padding: 'var(--s-3) var(--s-4)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--s-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
              <span style={{
                font: '600 11px/1 var(--font-mono)', color: 'var(--fg-3)',
                background: 'var(--bg)', border: '1px solid var(--border)',
                padding: '3px 5px', borderRadius: 3,
              }}>
                {project.key}
              </span>
              <span style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                {project.name}
              </span>
            </div>
            {project.description && (
              <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
                {project.description}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {(['list', 'board'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  height: 28, padding: '0 10px',
                  border: 'none', borderRight: v === 'list' ? '1px solid var(--border)' : 'none',
                  background: view === v ? 'var(--indigo)' : 'var(--bg)',
                  color: view === v ? 'var(--white)' : 'var(--fg-2)',
                  font: '500 12px/1 var(--font-sans)', cursor: 'pointer',
                }}
              >
                {v === 'list' ? 'Daftar' : 'Board'}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onCreate} style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <input
            value={creatingTitle}
            onChange={(e) => setCreatingTitle(e.target.value)}
            placeholder="Issue baru…"
            style={{
              width: 260, height: 32, padding: '0 10px',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              background: 'var(--bg)', font: '400 13px/1 var(--font-sans)',
              color: 'var(--fg-1)', outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={creating || !creatingTitle.trim()}
            style={{
              height: 32, padding: '0 14px', background: 'var(--indigo)',
              color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
              font: '600 12px/1 var(--font-sans)',
              cursor: creating || !creatingTitle.trim() ? 'not-allowed' : 'pointer',
              opacity: creating || !creatingTitle.trim() ? 0.6 : 1,
            }}
          >
            Tambah
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '8px 16px', font: '500 12px/1 var(--font-sans)', color: 'var(--amber)', background: 'rgba(179,90,0,0.05)' }}>
          {error}
        </div>
      )}

      {view === 'list' ? (
        <ListView grouped={grouped} members={members} currentUserId={currentUserId} onPatch={patchIssue} />
      ) : (
        <KanbanView grouped={grouped} members={members} newCardId={newCardId} onPatch={patchIssue} projectKey={project.key} />
      )}
    </>
  )
}

/* ── List view ─────────────────────────────────────────────────────────── */

function ListView({
  grouped,
  members,
  currentUserId,
  onPatch,
}: {
  grouped: { status: IssueStatus; label: string; rows: IssueRow[] }[]
  members: { id: string; name: string; email: string }[]
  currentUserId: string
  onPatch: (id: string, patch: Record<string, unknown>) => void
}) {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
      {grouped.map(({ status, label, rows }) => (
        <section key={status} style={{ borderBottom: '1px solid var(--border)' }}>
          <header style={{
            padding: '10px 16px', background: 'var(--surface)',
            font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase',
            letterSpacing: '0.6px', color: 'var(--fg-3)',
            display: 'flex', alignItems: 'center', gap: 8,
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            <span>{label}</span>
            <span style={{ font: '500 11px/1 var(--font-sans)' }}>{rows.length}</span>
          </header>
          {rows.length === 0 ? (
            <div style={{ padding: '10px 16px', font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
              Tidak ada issue.
            </div>
          ) : (
            rows.map((r) => (
              <ListIssueRow
                key={r.issue.id}
                row={r}
                members={members}
                currentUserId={currentUserId}
                onPatch={(patch) => onPatch(r.issue.id, patch)}
              />
            ))
          )}
        </section>
      ))}
    </div>
  )
}

function ListIssueRow({
  row,
  members,
  onPatch,
}: {
  row: IssueRow
  members: { id: string; name: string; email: string }[]
  currentUserId: string
  onPatch: (patch: Record<string, unknown>) => void
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 100px 120px 140px',
      gap: 'var(--s-3)', padding: '10px 16px',
      borderTop: '1px solid var(--border)', background: 'var(--surface)',
      alignItems: 'center', font: '400 13px/1.3 var(--font-sans)',
      borderLeft: `4px solid ${PRIORITY_STRIPE[row.issue.priority]}`,
    }}>
      <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--fg-3)' }}>
        {STATUS_COLUMNS.find(c => c.status === row.issue.status)
          ? `${row.issue.number}` : row.issue.number}
      </span>
      <span style={{ color: 'var(--fg-1)' }}>{row.issue.title}</span>

      <select
        value={row.issue.priority}
        onChange={(e) => onPatch({ priority: e.target.value })}
        style={{ ...selectStyle, color: PRIORITY_COLOR[row.issue.priority] }}
      >
        {(Object.keys(PRIORITY_LABEL) as IssuePriority[]).map((p) => (
          <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
        ))}
      </select>

      <select
        value={row.issue.status}
        onChange={(e) => onPatch({ status: e.target.value })}
        style={selectStyle}
      >
        {STATUS_COLUMNS.map((c) => (
          <option key={c.status} value={c.status}>{c.label}</option>
        ))}
      </select>

      <select
        value={row.issue.assigneeId ?? ''}
        onChange={(e) => onPatch({ assigneeId: e.target.value || null })}
        style={selectStyle}
      >
        <option value="">Belum ditugaskan</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  )
}

/* ── Kanban board view ─────────────────────────────────────────────────── */

function KanbanView({
  grouped,
  members,
  newCardId,
  onPatch,
  projectKey,
}: {
  grouped: { status: IssueStatus; label: string; color: string; rows: IssueRow[] }[]
  members: { id: string; name: string; email: string }[]
  newCardId: string | null
  onPatch: (id: string, patch: Record<string, unknown>) => void
  projectKey: string
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<IssueStatus | null>(null)
  const dragOriginRef = useRef<IssueStatus | null>(null)

  function onDragStart(issueId: string, fromStatus: IssueStatus) {
    setDragId(issueId)
    dragOriginRef.current = fromStatus
  }

  function onDragEnd() {
    setDragId(null)
    setDragOverCol(null)
    dragOriginRef.current = null
  }

  function onDrop(toStatus: IssueStatus) {
    if (!dragId || toStatus === dragOriginRef.current) {
      setDragId(null)
      setDragOverCol(null)
      return
    }
    onPatch(dragId, { status: toStatus })
    setDragId(null)
    setDragOverCol(null)
  }

  return (
    <div style={{
      flex: 1, overflowX: 'auto', overflowY: 'hidden',
      display: 'flex', gap: 10, padding: '14px 16px',
      background: 'var(--bg)', alignItems: 'flex-start',
    }}>
      {grouped.map(({ status, label, color, rows }) => {
        const isOver = dragOverCol === status
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(status) }}
            onDragLeave={() => { if (dragOverCol === status) setDragOverCol(null) }}
            onDrop={() => onDrop(status)}
            style={{
              width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 160px)',
              background: isOver ? 'rgba(59,79,196,0.04)' : 'transparent',
              borderRadius: 'var(--r-md)',
              border: isOver ? '1.5px dashed var(--indigo)' : '1.5px solid transparent',
              transition: 'background 0.12s, border-color 0.12s',
            }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 10px 8px', flexShrink: 0,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, flexShrink: 0, display: 'inline-block',
              }} />
              <span style={{
                font: '600 11px/1 var(--font-sans)', color: 'var(--fg-2)',
                textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1,
              }}>
                {label}
              </span>
              <span style={{
                font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                padding: '1px 6px', borderRadius: 999,
              }}>
                {rows.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{
              flex: 1, overflowY: 'auto', display: 'flex',
              flexDirection: 'column', gap: 6, padding: '0 4px 8px',
            }}>
              {rows.map((r) => (
                <KanbanCard
                  key={r.issue.id}
                  row={r}
                  projectKey={projectKey}
                  members={members}
                  isNew={r.issue.id === newCardId}
                  isDragging={dragId === r.issue.id}
                  onDragStart={() => onDragStart(r.issue.id, status)}
                  onDragEnd={onDragEnd}
                  onPatch={(patch) => onPatch(r.issue.id, patch)}
                />
              ))}
              {rows.length === 0 && !isOver && (
                <div style={{
                  padding: '20px 10px', textAlign: 'center',
                  font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)',
                }}>
                  Kosong
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({
  row,
  projectKey,
  members,
  isNew,
  isDragging,
  onDragStart,
  onDragEnd,
  onPatch,
}: {
  row: IssueRow
  projectKey: string
  members: { id: string; name: string; email: string }[]
  isNew: boolean
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onPatch: (patch: Record<string, unknown>) => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        borderLeft: `4px solid ${PRIORITY_STRIPE[row.issue.priority]}`,
        padding: '8px 10px 8px 8px',
        cursor: 'grab',
        opacity: isDragging ? 0.45 : 1,
        transition: isNew
          ? 'opacity 0.18s ease-out, transform 0.18s ease-out'
          : 'opacity 0.12s',
        transform: isNew ? 'translateY(0)' : undefined,
        animation: isNew ? 'cardEnter 0.18s ease-out' : undefined,
        willChange: isDragging ? 'transform' : undefined,
        boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        userSelect: 'none',
      }}
    >
      {/* Issue number */}
      <div style={{
        font: '500 11px/1 var(--font-mono)', color: 'var(--fg-3)', marginBottom: 5,
      }}>
        {projectKey}-{row.issue.number}
      </div>

      {/* Title */}
      <div style={{
        font: '500 13px/1.35 var(--font-sans)', color: 'var(--fg-1)',
        marginBottom: 8, wordBreak: 'break-word',
      }}>
        {row.issue.title}
      </div>

      {/* Footer: priority + assignee */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <select
          value={row.issue.priority}
          onChange={(e) => onPatch({ priority: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{
            height: 22, padding: '0 4px', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', background: 'transparent',
            font: '500 11px/1 var(--font-sans)', color: PRIORITY_COLOR[row.issue.priority],
            outline: 'none', cursor: 'pointer',
          }}
        >
          {(Object.keys(PRIORITY_LABEL) as IssuePriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>

        <AssigneeChip
          assignee={row.assignee}
          members={members}
          value={row.issue.assigneeId ?? ''}
          onChange={(v) => onPatch({ assigneeId: v || null })}
        />
      </div>
    </div>
  )
}

function AssigneeChip({
  assignee,
  members,
  value,
  onChange,
}: {
  assignee: { id: string; name: string } | null
  members: { id: string; name: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        title={assignee?.name ?? 'Belum ditugaskan'}
        style={{
          width: 24, height: 24, borderRadius: '50%',
          background: assignee ? 'var(--indigo)' : 'var(--bg)',
          border: `1px solid ${assignee ? 'transparent' : 'var(--border)'}`,
          color: assignee ? 'var(--white)' : 'var(--fg-3)',
          font: '600 9px/1 var(--font-sans)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {assignee ? initials(assignee.name) : '+'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 10, minWidth: 160, overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[{ id: '', name: 'Belum ditugaskan' }, ...members].map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', border: 'none', cursor: 'pointer',
                background: value === m.id ? 'rgba(59,79,196,0.08)' : 'transparent',
                font: '400 12px/1 var(--font-sans)', color: 'var(--fg-1)',
              }}
            >
              {m.id ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: 'var(--indigo)',
                    color: 'var(--white)', font: '600 8px/1 var(--font-sans)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {initials(m.name)}
                  </span>
                  {m.name}
                </span>
              ) : (
                <span style={{ color: 'var(--fg-3)' }}>{m.name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  height: 28, padding: '0 6px',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', font: '500 12px/1 var(--font-sans)',
  color: 'var(--fg-2)', outline: 'none', cursor: 'pointer',
}
