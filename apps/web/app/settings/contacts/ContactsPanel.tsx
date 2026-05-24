'use client'

import { useMemo, useState } from 'react'
import type { ContactRow, ContactStats } from '../../../lib/contacts'
import type { ContactRole, ContactType } from '@kantorcore/db'
import { CopyRecordButton } from '../../../components/CopyRecordButton'

const ROLE_LABEL: Record<ContactRole, string> = {
  staff: 'Karyawan',
  customer: 'Pelanggan',
  vendor: 'Vendor',
  lead: 'Lead',
  other: 'Lainnya',
}

const ROLE_COLOR: Record<ContactRole, string> = {
  staff: 'var(--indigo)',
  customer: 'var(--teal)',
  vendor: 'var(--amber)',
  lead: '#7B5AD8',
  other: 'var(--fg-3)',
}

const TYPE_LABEL: Record<ContactType, string> = {
  person: 'Perorangan',
  organization: 'Organisasi',
}

interface Member {
  id: string
  name: string
  email: string
}

export default function ContactsPanel({
  contacts: initial,
  stats: initialStats,
  members,
  canCopy = false,
}: {
  contacts: ContactRow[]
  stats: ContactStats
  members: Member[]
  canCopy?: boolean
}) {
  const [contacts, setContacts] = useState<ContactRow[]>(initial)
  const [stats, setStats] = useState<ContactStats>(initialStats)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<ContactRole | 'all'>('all')
  const [editing, setEditing] = useState<ContactRow | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (roleFilter !== 'all' && !c.roles.includes(roleFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.contact.name.toLowerCase().includes(q) ||
          (c.contact.email ?? '').toLowerCase().includes(q) ||
          (c.contact.phone ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [contacts, search, roleFilter])

  function refreshStats(next: ContactRow[]) {
    const byRole: Record<ContactRole, number> = { staff: 0, customer: 0, vendor: 0, lead: 0, other: 0 }
    let linked = 0
    for (const c of next) {
      for (const r of c.roles) byRole[r]++
      if (c.linkedUser) linked++
    }
    setStats({ total: next.length, byRole, linkedToUsers: linked })
  }

  function onCreated(row: ContactRow) {
    const next = [...contacts, row].sort((a, b) => a.contact.name.localeCompare(b.contact.name))
    setContacts(next); refreshStats(next); setCreating(false)
  }

  function onUpdated(row: ContactRow) {
    const next = contacts.map((c) => (c.contact.id === row.contact.id ? row : c))
    setContacts(next); refreshStats(next); setEditing(null)
  }

  async function onDelete(id: string) {
    if (!confirm('Hapus kontak ini? Referensi dari invoice/bill akan diset NULL.')) return
    const res = await fetch(`/api/settings/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const next = contacts.filter((c) => c.contact.id !== id)
      setContacts(next); refreshStats(next); setEditing(null)
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 960, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
          <div>
            <h2 style={{ margin: 0 }}>Kontak</h2>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0', maxWidth: 540 }}>
              Catatan tunggal untuk setiap orang/organisasi yang berinteraksi dengan workspace —
              karyawan, pelanggan, vendor, dan lead. Modul HR, Keuangan, dan Sewa mengacu ke sini.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{ height: 34, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: 'pointer', flexShrink: 0 }}
          >
            + Kontak Baru
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 'var(--s-5)' }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Karyawan" value={stats.byRole.staff} color={ROLE_COLOR.staff} />
          <StatCard label="Pelanggan" value={stats.byRole.customer} color={ROLE_COLOR.customer} />
          <StatCard label="Vendor" value={stats.byRole.vendor} color={ROLE_COLOR.vendor} />
          <StatCard label="Tertaut user" value={stats.linkedToUsers} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-3)', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, telepon…"
            style={{ flex: 1, height: 34, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '400 13px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none' }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as ContactRole | 'all')}
            style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Semua peran</option>
            {(Object.keys(ROLE_LABEL) as ContactRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>

        {/* Create / edit drawer */}
        {(creating || editing) && (
          <ContactForm
            initial={editing}
            members={members}
            existingUserLinks={new Set(contacts.filter((c) => c.linkedUser && c.contact.id !== editing?.contact.id).map((c) => c.linkedUser!.id))}
            onCreated={onCreated}
            onUpdated={onUpdated}
            onCancel={() => { setCreating(false); setEditing(null) }}
            onDelete={editing ? () => onDelete(editing.contact.id) : undefined}
          />
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center', marginTop: 'var(--s-3)' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
              {contacts.length === 0 ? 'Belum ada kontak.' : 'Tidak ada kontak yang cocok dengan filter.'}
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['Nama', 'Tipe', 'Kontak', 'Peran', 'User Login', ''].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.contact.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                      {row.contact.name}
                      {row.contact.npwp && (
                        <div style={{ font: '11px/1.3 var(--font-mono)', color: 'var(--fg-3)', marginTop: 2 }}>
                          NPWP {row.contact.npwp}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-2)', font: '12px/1 var(--font-sans)' }}>
                      {TYPE_LABEL[row.contact.type]}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.contact.email && <div style={{ color: 'var(--fg-2)', font: '12px/1.3 var(--font-sans)' }}>{row.contact.email}</div>}
                      {row.contact.phone && <div style={{ color: 'var(--fg-3)', font: '12px/1.3 var(--font-sans)', marginTop: 2 }}>{row.contact.phone}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {row.roles.length === 0 ? <span style={{ color: 'var(--fg-3)' }}>—</span> :
                          row.roles.map((r) => (
                            <span key={r} style={{ font: '600 10px/1 var(--font-sans)', color: ROLE_COLOR[r], border: `1px solid ${ROLE_COLOR[r]}`, padding: '3px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {ROLE_LABEL[r]}
                            </span>
                          ))
                        }
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-3)', font: '12px/1.3 var(--font-sans)' }}>
                      {row.linkedUser ? (
                        <span style={{ color: 'var(--indigo)' }}>✓ {row.linkedUser.email}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {canCopy && (
                          <CopyRecordButton
                            buttonLabel="Salin"
                            fields={[
                              { label: 'Nama', value: row.contact.name },
                              { label: 'Telepon', value: row.contact.phone },
                              { label: 'Email', value: row.contact.email },
                            ]}
                          />
                        )}
                        <button
                          onClick={() => setEditing(row)}
                          style={{ height: 26, padding: '0 10px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ font: '600 18px/1 var(--font-sans)', color: color ?? 'var(--fg-1)' }}>{value}</div>
      <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 5 }}>{label}</div>
    </div>
  )
}

function ContactForm({
  initial,
  members,
  existingUserLinks,
  onCreated,
  onUpdated,
  onCancel,
  onDelete,
}: {
  initial: ContactRow | null
  members: Member[]
  existingUserLinks: Set<string>
  onCreated: (row: ContactRow) => void
  onUpdated: (row: ContactRow) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [type, setType] = useState<ContactType>(initial?.contact.type ?? 'person')
  const [name, setName] = useState(initial?.contact.name ?? '')
  const [email, setEmail] = useState(initial?.contact.email ?? '')
  const [phone, setPhone] = useState(initial?.contact.phone ?? '')
  const [npwp, setNpwp] = useState(initial?.contact.npwp ?? '')
  const [address, setAddress] = useState(initial?.contact.address ?? '')
  const [userId, setUserId] = useState(initial?.linkedUser?.id ?? '')
  const [roles, setRoles] = useState<Set<ContactRole>>(new Set(initial?.roles ?? []))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!initial

  function toggleRole(r: ContactRole) {
    setRoles((prev) => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }

  async function save() {
    if (!name.trim()) { setError('Nama wajib diisi.'); return }
    setSaving(true); setError(null)

    const payload = {
      type, name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      npwp: npwp.trim() || null,
      address: address.trim() || null,
      userId: userId || null,
      roles: Array.from(roles),
    }

    const res = isEdit
      ? await fetch(`/api/settings/contacts/${initial!.contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/settings/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data.contact) {
      const linkedUser = userId ? members.find((m) => m.id === userId) ?? null : null
      const row: ContactRow = { contact: data.contact, roles: Array.from(roles), linkedUser }
      isEdit ? onUpdated(row) : onCreated(row)
    } else {
      setError(data.error ?? 'Gagal menyimpan kontak.')
    }
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--indigo)', borderRadius: 'var(--r-md)', padding: 'var(--s-4)', marginBottom: 'var(--s-4)' }}>
      <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 'var(--s-3)' }}>
        {isEdit ? 'Edit Kontak' : 'Kontak Baru'}
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)', marginBottom: 'var(--s-3)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Tipe">
          <select value={type} onChange={(e) => setType(e.target.value as ContactType)} style={inputStyle}>
            <option value="person">Perorangan</option>
            <option value="organization">Organisasi</option>
          </select>
        </Field>
        <Field label="Nama *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. Budi Santoso / PT Maju Jaya" style={inputStyle} />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opsional" style={inputStyle} />
        </Field>
        <Field label="Telepon">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62…" style={inputStyle} />
        </Field>
        <Field label="NPWP">
          <input value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="12.345.678.9-012.000" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
        </Field>
        <Field label="Tertaut User Login">
          <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle}>
            <option value="">— Tidak tertaut —</option>
            {members
              .filter((m) => m.id === userId || !existingUserLinks.has(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>{m.name} · {m.email}</option>
              ))}
          </select>
        </Field>
      </div>

      <Field label="Alamat">
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
      </Field>

      <Field label="Peran">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(ROLE_LABEL) as ContactRole[]).map((r) => {
            const on = roles.has(r)
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                style={{
                  height: 28, padding: '0 10px', borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${on ? ROLE_COLOR[r] : 'var(--border)'}`,
                  background: on ? ROLE_COLOR[r] : 'transparent',
                  color: on ? 'var(--white)' : 'var(--fg-2)',
                  font: '500 12px/1 var(--font-sans)',
                }}
              >
                {ROLE_LABEL[r]}
              </button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s-4)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ height: 32, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Kontak'}
          </button>
          <button onClick={onCancel} style={{ height: 32, padding: '0 12px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
            Batal
          </button>
        </div>
        {onDelete && (
          <button onClick={onDelete} style={{ height: 32, padding: '0 12px', border: '1px solid rgba(179,90,0,0.3)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 12px/1 var(--font-sans)', color: 'var(--amber)', cursor: 'pointer' }}>
            Hapus Kontak
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
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
