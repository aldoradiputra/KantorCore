'use client'

import { useState } from 'react'
import type { DirectoryRow } from '../../../lib/admin'

const ROLE_LABEL: Record<string, string> = { owner: 'Pemilik', admin: 'Admin', member: 'Anggota' }

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default function DirectoryPanel({ directory: initial }: { directory: DirectoryRow[] }) {
  const [directory, setDirectory] = useState<DirectoryRow[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)

  function onSaved(userId: string, updated: Partial<DirectoryRow['profile']>) {
    setDirectory((prev) =>
      prev.map((row) => {
        if (row.user.id !== userId) return row
        const base = row.profile ?? {
          id: '', tenantId: '', userId, department: null, jobTitle: null,
          managerId: null, employeeId: null, phone: null, updatedAt: new Date(),
        }
        return { ...row, profile: { ...base, ...updated, updatedAt: new Date() } }
      }),
    )
    setEditingId(null)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 860, width: '100%' }}>
        <div style={{ marginBottom: 'var(--s-6)' }}>
          <h2 style={{ margin: 0 }}>Direktori</h2>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Profil organisasi anggota — departemen, jabatan, manajer, dan ID karyawan.
            Data ini digunakan di modul HR dan penggajian.
          </p>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Anggota', 'Role', 'Departemen', 'Jabatan', 'Manajer', 'ID Karyawan', ''].map((h) => (
                  <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {directory.map((row) =>
                editingId === row.user.id ? (
                  <EditRow
                    key={row.user.id}
                    row={row}
                    allUsers={directory.map((r) => r.user)}
                    onSaved={(p) => onSaved(row.user.id, p)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={row.user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--indigo)', color: 'var(--white)', font: '600 10px/1 var(--font-sans)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {initials(row.user.name)}
                        </span>
                        <div>
                          <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{row.user.name}</div>
                          <div style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{row.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-3)', font: '12px/1 var(--font-sans)' }}>
                      {ROLE_LABEL[row.role] ?? row.role}
                    </td>
                    <Td>{row.profile?.department}</Td>
                    <Td>{row.profile?.jobTitle}</Td>
                    <Td>{row.manager?.name}</Td>
                    <Td mono>{row.profile?.employeeId}</Td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={() => setEditingId(row.user.id)} style={editBtnStyle}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Td({ children, mono }: { children?: string | null; mono?: boolean }) {
  return (
    <td style={{ padding: '10px 14px', color: children ? 'var(--fg-2)' : 'var(--fg-3)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined, fontSize: mono ? 12 : undefined }}>
      {children ?? '—'}
    </td>
  )
}

function EditRow({
  row,
  allUsers,
  onSaved,
  onCancel,
}: {
  row: DirectoryRow
  allUsers: { id: string; name: string }[]
  onSaved: (p: Partial<DirectoryRow['profile']>) => void
  onCancel: () => void
}) {
  const [dept, setDept] = useState(row.profile?.department ?? '')
  const [title, setTitle] = useState(row.profile?.jobTitle ?? '')
  const [managerId, setManagerId] = useState(row.profile?.managerId ?? '')
  const [empId, setEmpId] = useState(row.profile?.employeeId ?? '')
  const [phone, setPhone] = useState(row.profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true); setError(null)
    const res = await fetch(`/api/settings/directory/${row.user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department: dept || null,
        jobTitle: title || null,
        managerId: managerId || null,
        employeeId: empId || null,
        phone: phone || null,
      }),
    })
    if (res.ok) {
      onSaved({ department: dept || null, jobTitle: title || null, managerId: managerId || null, employeeId: empId || null, phone: phone || null })
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Gagal menyimpan.')
    }
    setSaving(false)
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(59,79,196,0.03)' }}>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{row.user.name}</div>
        {error && <div style={{ font: '11px/1.3 var(--font-sans)', color: 'var(--amber)', marginTop: 4 }}>{error}</div>}
      </td>
      <td style={{ padding: '10px 14px', color: 'var(--fg-3)', font: '12px/1 var(--font-sans)' }}>
        {ROLE_LABEL[row.role] ?? row.role}
      </td>
      <td style={{ padding: '6px 14px' }}><input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Departemen" style={inlineInput} /></td>
      <td style={{ padding: '6px 14px' }}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jabatan" style={inlineInput} /></td>
      <td style={{ padding: '6px 14px' }}>
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)} style={{ ...inlineInput, cursor: 'pointer' }}>
          <option value="">—</option>
          {allUsers.filter((u) => u.id !== row.user.id).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px 14px' }}><input value={empId} onChange={(e) => setEmpId(e.target.value)} placeholder="ID" style={{ ...inlineInput, fontFamily: 'var(--font-mono)', fontSize: 12 }} /></td>
      <td style={{ padding: '6px 14px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving} style={{ height: 28, padding: '0 10px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 11px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? '…' : 'Simpan'}
          </button>
          <button onClick={onCancel} style={{ height: 28, padding: '0 8px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
            Batal
          </button>
        </div>
      </td>
    </tr>
  )
}

const editBtnStyle: React.CSSProperties = {
  height: 26, padding: '0 10px', border: '1px solid var(--border)', background: 'transparent',
  borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer',
}
const inlineInput: React.CSSProperties = {
  height: 30, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', font: '400 12px/1 var(--font-sans)', color: 'var(--fg-1)',
  outline: 'none', width: '100%',
}
