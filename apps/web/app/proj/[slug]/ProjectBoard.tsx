'use client'

import { useState } from 'react'
import type { Project, IssueStatus, IssuePriority } from '@kantr/db'

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

const STATUS_COLUMNS: { status: IssueStatus; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'Sedang dikerjakan' },
  { status: 'in_review', label: 'Review' },
  { status: 'done', label: 'Selesai' },
  { status: 'cancelled', label: 'Dibatalkan' },
]

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  none: '—',
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  urgent: 'Mendesak',
}

const PRIORITY_COLOR: Record<IssuePriority, string> = {
  none: 'var(--fg-3)',
  low: 'var(--teal)',
  medium: 'var(--indigo)',
  high: 'var(--amber)',
  urgent: '#C13D3D',
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
  const [creatingTitle, setCreatingTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setCreatingTitle('')
      await refresh()
    } else {
      const data = await res.json().catch(() => ({ error: 'Gagal membuat issue.' }))
      setError(data.error ?? 'Gagal membuat issue.')
    }
    setCreating(false)
  }

  async function patchIssue(id: string, patch: Record<string, unknown>) {
    // Optimistic update.
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

  const grouped = STATUS_COLUMNS.map(({ status, label }) => ({
    status,
    label,
    rows: issues.filter((r) => r.issue.status === status),
  }))

  return (
    <>
      <div
        style={{
          padding: 'var(--s-3) var(--s-4)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
            <span
              style={{
                font: '600 11px/1 var(--font-mono)',
                color: 'var(--fg-3)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                padding: '3px 5px',
                borderRadius: 3,
              }}
            >
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
        <form onSubmit={onCreate} style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <input
            value={creatingTitle}
            onChange={(e) => setCreatingTitle(e.target.value)}
            placeholder="Issue baru…"
            style={{
              width: 260,
              height: 32,
              padding: '0 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg)',
              font: '400 13px/1 var(--font-sans)',
              color: 'var(--fg-1)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={creating || !creatingTitle.trim()}
            style={{
              height: 32,
              padding: '0 14px',
              background: 'var(--indigo)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
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

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {grouped.map(({ status, label, rows }) => (
          <section key={status} style={{ borderBottom: '1px solid var(--border)' }}>
            <header
              style={{
                padding: '10px 16px',
                background: 'var(--surface)',
                font: '600 11px/1 var(--font-sans)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: 'var(--fg-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              <span>{label}</span>
              <span style={{ color: 'var(--fg-3)', font: '500 11px/1 var(--font-sans)' }}>
                {rows.length}
              </span>
            </header>
            {rows.length === 0 ? (
              <div style={{ padding: '10px 16px', font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                Tidak ada issue.
              </div>
            ) : (
              rows.map((r) => (
                <IssueRowEl
                  key={r.issue.id}
                  row={r}
                  projectKey={project.key}
                  members={members}
                  currentUserId={currentUserId}
                  onPatch={(patch) => patchIssue(r.issue.id, patch)}
                />
              ))
            )}
          </section>
        ))}
      </div>
    </>
  )
}

function IssueRowEl({
  row,
  projectKey,
  members,
  onPatch,
}: {
  row: IssueRow
  projectKey: string
  members: { id: string; name: string; email: string }[]
  currentUserId: string
  onPatch: (patch: Record<string, unknown>) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr 100px 120px 140px',
        gap: 'var(--s-3)',
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        alignItems: 'center',
        font: '400 13px/1.3 var(--font-sans)',
      }}
    >
      <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--fg-3)' }}>
        {projectKey}-{row.issue.number}
      </span>
      <span style={{ color: 'var(--fg-1)' }}>{row.issue.title}</span>

      <select
        value={row.issue.priority}
        onChange={(e) => onPatch({ priority: e.target.value })}
        style={{
          ...selectStyle,
          color: PRIORITY_COLOR[row.issue.priority],
          fontWeight: row.issue.priority === 'urgent' ? 600 : 500,
        }}
      >
        {(Object.keys(PRIORITY_LABEL) as IssuePriority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>

      <select
        value={row.issue.status}
        onChange={(e) => onPatch({ status: e.target.value })}
        style={selectStyle}
      >
        {STATUS_COLUMNS.map((c) => (
          <option key={c.status} value={c.status}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={row.issue.assigneeId ?? ''}
        onChange={(e) => onPatch({ assigneeId: e.target.value || null })}
        style={selectStyle}
      >
        <option value="">Belum ditugaskan</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  height: 28,
  padding: '0 6px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  background: 'var(--bg)',
  font: '500 12px/1 var(--font-sans)',
  color: 'var(--fg-2)',
  outline: 'none',
  cursor: 'pointer',
}
