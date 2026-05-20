'use client'

import { useState } from 'react'
import type { GroupRow } from '../../../lib/admin'

interface Member {
  id: string
  name: string
  email: string
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default function GroupsPanel({
  groups: initialGroups,
  members,
}: {
  tenantId: string
  groups: GroupRow[]
  members: Member[]
}) {
  const [groups, setGroups] = useState<GroupRow[]>(initialGroups)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAlias, setNewAlias] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || saving) return
    setSaving(true); setError(null)
    const res = await fetch('/api/settings/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), emailAlias: newAlias.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.group) {
      setGroups((prev) => [...prev, { group: data.group, memberCount: 0, members: [] }])
      setNewName(''); setNewDesc(''); setNewAlias(''); setCreating(false)
    } else {
      setError(data.error ?? 'Gagal membuat grup.')
    }
    setSaving(false)
  }

  async function onDelete(groupId: string) {
    if (!confirm('Hapus grup ini? Tindakan tidak bisa dibatalkan.')) return
    const res = await fetch(`/api/settings/groups/${groupId}`, { method: 'DELETE' })
    if (res.ok) setGroups((prev) => prev.filter((g) => g.group.id !== groupId))
  }

  async function onSaveMembers(groupId: string, userIds: string[]) {
    const res = await fetch(`/api/settings/groups/${groupId}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds }),
    })
    if (res.ok) {
      setGroups((prev) => prev.map((g) => {
        if (g.group.id !== groupId) return g
        const newMembers = members.filter((m) => userIds.includes(m.id))
        return { ...g, memberCount: newMembers.length, members: newMembers }
      }))
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 720, width: '100%' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-6)' }}>
          <div>
            <h2 style={{ margin: 0 }}>Grup</h2>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
              Kelompokkan anggota untuk notifikasi, mention, dan routing persetujuan.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{
              height: 34, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)',
              border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            + Grup Baru
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div style={{ marginBottom: 'var(--s-5)', padding: 'var(--s-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
            <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 'var(--s-4)' }}>Grup baru</div>
            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1 var(--font-sans)', color: 'var(--amber)', marginBottom: 'var(--s-3)' }}>
                {error}
              </div>
            )}
            <form onSubmit={onCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Nama grup *</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="Mis. Finance, HR, Engineering" style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Deskripsi</span>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Opsional" style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Alias email</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input value={newAlias} onChange={(e) => setNewAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="finance" style={{ ...inputStyle, width: 160 }} />
                  <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>@workspace (aktif saat IS-EMAIL ship)</span>
                </div>
              </label>
              <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 4 }}>
                <button type="submit" disabled={saving || !newName.trim()} style={{ height: 32, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer', opacity: !newName.trim() ? 0.6 : 1 }}>
                  {saving ? 'Menyimpan…' : 'Buat Grup'}
                </button>
                <button type="button" onClick={() => { setCreating(false); setError(null) }} style={{ height: 32, padding: '0 12px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Group list */}
        {groups.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada grup.</div>
            <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>Buat grup untuk mengelompokkan anggota tim.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups.map(({ group, memberCount, members: groupMembers }) => {
              const expanded = expandedId === group.id
              return (
                <div key={group.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <div
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 'var(--s-3)', cursor: 'pointer' }}
                    onClick={() => setExpandedId(expanded ? null : group.id)}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--indigo-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--indigo)' }}>
                        {group.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{group.name}</div>
                      {group.description && (
                        <div style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{group.description}</div>
                      )}
                    </div>
                    {group.emailAlias && (
                      <code style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--fg-3)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '3px 6px', borderRadius: 3, flexShrink: 0 }}>
                        {group.emailAlias}@
                      </code>
                    )}
                    <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', flexShrink: 0 }}>
                      {memberCount} anggota
                    </span>
                    <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', flexShrink: 0 }}>
                      {expanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {expanded && (
                    <MemberEditor
                      groupId={group.id}
                      allMembers={members}
                      currentMemberIds={groupMembers.map((m) => m.id)}
                      onSave={(ids) => onSaveMembers(group.id, ids)}
                      onDelete={() => onDelete(group.id)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MemberEditor({
  groupId,
  allMembers,
  currentMemberIds,
  onSave,
  onDelete,
}: {
  groupId: string
  allMembers: Member[]
  currentMemberIds: string[]
  onSave: (ids: string[]) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentMemberIds))
  const [saving, setSaving] = useState(false)
  void groupId

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    await onSave(Array.from(selected))
    setSaving(false)
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg)' }}>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Anggota grup
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {allMembers.map((m) => {
          const on = selected.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--indigo)' : 'var(--border)'}`,
                background: on ? 'var(--indigo-light)' : 'var(--surface)',
                color: on ? 'var(--indigo)' : 'var(--fg-2)',
                font: '500 12px/1 var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: on ? 'var(--indigo)' : 'var(--bg)', border: on ? 'none' : '1px solid var(--border)', color: on ? 'var(--white)' : 'var(--fg-3)', font: '600 8px/1 var(--font-sans)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initials(m.name)}
              </span>
              {m.name}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ height: 30, padding: '0 12px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 11px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? 'Menyimpan…' : 'Simpan Anggota'}
        </button>
        <button
          onClick={onDelete}
          style={{ height: 30, padding: '0 12px', background: 'transparent', color: 'var(--amber)', border: '1px solid rgba(179,90,0,0.3)', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', cursor: 'pointer' }}
        >
          Hapus Grup
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)',
}
const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', background: 'var(--bg)',
  font: '400 13px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none',
}
