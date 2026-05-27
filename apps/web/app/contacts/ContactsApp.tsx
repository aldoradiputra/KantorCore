'use client'

import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { ContactRow, ContactStats } from '../../lib/contacts'
import { formatIndonesianAddress } from '../../lib/contacts-utils'
import type { ContactAddressType, ContactRole, ContactType } from '@kantorcore/db'

// Lazy-loaded view components for bundle code-splitting
const ContactKanbanView = lazy(() => import('./ContactKanbanView'))
const ContactMapView = lazy(() => import('./ContactMapView'))

// ── Constants ──────────────────────────────────────────────────

const ROLE_LABEL: Record<ContactRole, string> = {
  staff: 'Karyawan', customer: 'Pelanggan', vendor: 'Vendor', lead: 'Lead', other: 'Lainnya',
}
const ROLE_COLOR: Record<ContactRole, string> = {
  staff: 'var(--indigo)', customer: 'var(--teal)', vendor: 'var(--amber)', lead: '#7B5AD8', other: 'var(--fg-3)',
}
const TYPE_LABEL: Record<ContactType, string> = { individual: 'Perorangan', company: 'Perusahaan' }

const ADDR_TYPE_LABEL: Record<ContactAddressType, string> = {
  main: 'Kontak Utama', invoice: 'Alamat Invoice', delivery: 'Alamat Pengiriman',
  contact: 'Kontak', other: 'Alamat Lain',
}

interface Country { code: string; name: string; dialCode: string }

const COUNTRIES: Country[] = [
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'AF', name: 'Afghanistan', dialCode: '+93' },
  { code: 'AL', name: 'Albania', dialCode: '+355' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213' },
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'BN', name: 'Brunei', dialCode: '+673' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'IR', name: 'Iran', dialCode: '+98' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'IL', name: 'Israel', dialCode: '+972' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'JO', name: 'Jordan', dialCode: '+962' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'KR', name: 'Korea (South)', dialCode: '+82' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'LA', name: 'Laos', dialCode: '+856' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'MA', name: 'Morocco', dialCode: '+212' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'PH', name: 'Philippines', dialCode: '+63' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'QA', name: 'Qatar', dialCode: '+974' },
  { code: 'RO', name: 'Romania', dialCode: '+40' },
  { code: 'RU', name: 'Russia', dialCode: '+7' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216' },
  { code: 'TR', name: 'Turkey', dialCode: '+90' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'YE', name: 'Yemen', dialCode: '+967' },
]

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
]

// ── NPWP masking ───────────────────────────────────────────────

function formatNpwpDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 16)
  if (d.length === 16) return d // NPWP16 — display raw
  // Old 15-digit: XX.XXX.XXX.X-XXX.XXX
  let out = ''
  if (d.length > 0) out += d.slice(0, Math.min(2, d.length))
  if (d.length > 2) out += '.' + d.slice(2, Math.min(5, d.length))
  if (d.length > 5) out += '.' + d.slice(5, Math.min(8, d.length))
  if (d.length > 8) out += '.' + d.slice(8, Math.min(9, d.length))
  if (d.length > 9) out += '-' + d.slice(9, Math.min(12, d.length))
  if (d.length > 12) out += '.' + d.slice(12, Math.min(15, d.length))
  return out
}

// ── Main component ─────────────────────────────────────────────

type ViewMode = 'list' | 'kanban' | 'map'

interface Member { id: string; name: string; email: string }

export default function ContactsApp({
  contacts: initial,
  stats: initialStats,
  members,
  canEdit,
}: {
  contacts: ContactRow[]
  stats: ContactStats
  members: Member[]
  canEdit: boolean
}) {
  const [contacts, setContacts] = useState<ContactRow[]>(initial)
  const [stats, setStats] = useState<ContactStats>(initialStats)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<ContactRole | 'all'>('all')
  const [editing, setEditing] = useState<ContactRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<ViewMode>('list')

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (roleFilter !== 'all' && !c.roles.includes(roleFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.contact.name.toLowerCase().includes(q) ||
          (c.contact.email ?? '').toLowerCase().includes(q) ||
          (c.contact.phone ?? '').toLowerCase().includes(q) ||
          (c.contact.addrKota ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [contacts, search, roleFilter])

  // Kanban payload derived from filtered list
  const kanbanData = useMemo(() => {
    const companies = filtered.filter((r) => r.contact.type === 'company')
    const byCompany: Record<string, ContactRow[]> = {}
    const orphans: ContactRow[] = []
    for (const ind of filtered.filter((r) => r.contact.type === 'individual')) {
      const pid = ind.contact.parentId
      if (pid) { byCompany[pid] ??= []; byCompany[pid]!.push(ind) }
      else orphans.push(ind)
    }
    return { companies, byCompany, orphans }
  }, [filtered])

  // Map payload
  const mapContacts = useMemo(() => filtered.map((r) => ({
    ...r,
    formattedAddress: r.contact.country === 'ID'
      ? [r.contact.addrLine1, r.contact.addrKelurahan, r.contact.addrKecamatan, r.contact.addrKota, r.contact.addrProvinsi].filter(Boolean).join(', ')
      : (r.contact.address?.split('\n')[0] ?? ''),
    coords: null as null,
  })), [filtered])

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
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const next = contacts.filter((c) => c.contact.id !== id)
      setContacts(next); refreshStats(next); setEditing(null)
    }
  }

  function locationLabel(c: ContactRow['contact']): string {
    if (c.country === 'ID') return [c.addrKota, c.addrProvinsi].filter(Boolean).join(', ')
    if (c.address) return c.address.split('\n')[0] ?? ''
    return ''
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 1040, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
          <div>
            <h2 style={{ margin: 0 }}>Kontak</h2>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0', maxWidth: 540 }}>
              Catatan tunggal untuk setiap orang/organisasi — karyawan, pelanggan, vendor, dan lead.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View switcher */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
              {(['list', 'kanban', 'map'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{ height: 32, padding: '0 12px', border: 'none', background: view === v ? 'var(--indigo)' : 'transparent', color: view === v ? 'var(--white)' : 'var(--fg-2)', font: '500 12px/1 var(--font-sans)', cursor: 'pointer', textTransform: 'capitalize' }}
                >
                  {v === 'list' ? 'Daftar' : v === 'kanban' ? 'Kanban' : 'Peta'}
                </button>
              ))}
            </div>
            {canEdit && (
              <button
                onClick={() => { setEditing(null); setCreating(true) }}
                style={{ height: 34, padding: '0 14px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: 'pointer', flexShrink: 0 }}
              >
                + Kontak Baru
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 'var(--s-5)' }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Karyawan" value={stats.byRole.staff} color={ROLE_COLOR.staff} />
          <StatCard label="Pelanggan" value={stats.byRole.customer} color={ROLE_COLOR.customer} />
          <StatCard label="Vendor" value={stats.byRole.vendor} color={ROLE_COLOR.vendor} />
          <StatCard label="Tertaut user" value={stats.linkedToUsers} />
        </div>

        {/* Inline form — visible in any view when creating/editing */}
        {(creating || editing) && canEdit && (
          <ContactForm
            initial={editing}
            members={members}
            companies={contacts.filter((c) => c.contact.type === 'company')}
            existingUserLinks={new Set(contacts.filter((c) => c.linkedUser && c.contact.id !== editing?.contact.id).map((c) => c.linkedUser!.id))}
            onCreated={onCreated}
            onUpdated={onUpdated}
            onCancel={() => { setCreating(false); setEditing(null) }}
            onDelete={editing ? () => onDelete(editing.contact.id) : undefined}
          />
        )}

        {/* List view */}
        {view === 'list' && (
          <>
            <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-3)', alignItems: 'center' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, telepon, kota…"
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
                  {['Nama', 'Tipe', 'Kontak', 'Lokasi', 'Peran', 'PKP', ''].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const loc = locationLabel(row.contact)
                  return (
                    <tr key={row.contact.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                        {row.contact.name}
                        {row.contact.npwp && (
                          <div style={{ font: '11px/1.3 var(--font-mono)', color: 'var(--fg-3)', marginTop: 2 }}>NPWP {row.contact.npwp}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--fg-2)', font: '12px/1 var(--font-sans)', whiteSpace: 'nowrap' }}>
                        {TYPE_LABEL[row.contact.type]}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {row.contact.email && <div style={{ color: 'var(--fg-2)', font: '12px/1.3 var(--font-sans)' }}>{row.contact.email}</div>}
                        {row.contact.phone && <div style={{ color: 'var(--fg-3)', font: '12px/1.3 var(--font-sans)', marginTop: 2 }}>{row.contact.phone}</div>}
                        {row.contact.website && <div style={{ color: 'var(--teal)', font: '11px/1.3 var(--font-sans)', marginTop: 2 }}>{row.contact.website}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--fg-3)', font: '12px/1.3 var(--font-sans)', maxWidth: 160 }}>
                        {loc || '—'}
                        {row.contact.country && row.contact.country !== 'ID' && (
                          <span style={{ marginLeft: 4, font: '10px/1 var(--font-sans)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px' }}>{row.contact.country}</span>
                        )}
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
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {row.contact.isPkp ? (
                          <span style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '3px 6px', borderRadius: 999 }}>PKP</span>
                        ) : <span style={{ color: 'var(--fg-3)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Link
                            href={`/contacts/${row.contact.id}`}
                            style={{ height: 26, padding: '0 10px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                          >
                            Detail
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => { setCreating(false); setEditing(row) }}
                              style={{ height: 26, padding: '0 10px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        </>)}

        {/* Kanban view — lazy loaded */}
        {view === 'kanban' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>Memuat…</div>}>
            <ContactKanbanView data={kanbanData} />
          </Suspense>
        )}

        {/* Map view — lazy loaded */}
        {view === 'map' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)' }}>Memuat…</div>}>
            <ContactMapView contacts={mapContacts} />
          </Suspense>
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

// ── ContactForm ────────────────────────────────────────────────

function ContactForm({
  initial,
  members,
  companies,
  existingUserLinks,
  onCreated,
  onUpdated,
  onCancel,
  onDelete,
}: {
  initial: ContactRow | null
  members: Member[]
  companies: ContactRow[]
  existingUserLinks: Set<string>
  onCreated: (row: ContactRow) => void
  onUpdated: (row: ContactRow) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const isEdit = !!initial
  const c = initial?.contact

  const [type, setType] = useState<ContactType>(c?.type ?? 'individual')
  const [name, setName] = useState(c?.name ?? '')
  const [parentId, setParentId] = useState(c?.parentId ?? '')
  const [addressType, setAddressType] = useState<ContactAddressType>(c?.addressType ?? 'main')
  const [email, setEmail] = useState(c?.email ?? '')
  const [phoneRaw, setPhoneRaw] = useState(c?.phone ?? '')
  const [npwpRaw, setNpwpRaw] = useState(() => (c?.npwp ?? '').replace(/\D/g, ''))
  const [notes, setNotes] = useState(c?.notes ?? '')
  const [userId, setUserId] = useState(initial?.linkedUser?.id ?? '')
  const [roles, setRoles] = useState<Set<ContactRole>>(new Set(initial?.roles ?? []))

  // Extended
  const [isPkp, setIsPkp] = useState(c?.isPkp ?? false)
  const [website, setWebsite] = useState(c?.website ?? '')
  const [language, setLanguage] = useState(c?.language ?? '')
  const [country, setCountry] = useState(c?.country ?? 'ID')
  const prevDialCode = useRef(COUNTRIES.find(x => x.code === (c?.country ?? 'ID'))?.dialCode ?? '+62')

  // Indonesian address
  const [addrLine1, setAddrLine1] = useState(c?.addrLine1 ?? '')
  const [addrLine2, setAddrLine2] = useState(c?.addrLine2 ?? '')
  const [addrRt, setAddrRt] = useState(c?.addrRt ?? '')
  const [addrRw, setAddrRw] = useState(c?.addrRw ?? '')
  const [addrKelurahan, setAddrKelurahan] = useState(c?.addrKelurahan ?? '')
  const [addrKecamatan, setAddrKecamatan] = useState(c?.addrKecamatan ?? '')
  const [addrKota, setAddrKota] = useState(c?.addrKota ?? '')
  const [addrProvinsi, setAddrProvinsi] = useState(c?.addrProvinsi ?? '')
  const [addrKodePos, setAddrKodePos] = useState(c?.addrKodePos ?? '')
  // Non-Indonesia address
  const [address, setAddress] = useState(c?.address ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isIndonesia = country === 'ID'

  const npwpDisplay = formatNpwpDisplay(npwpRaw)

  function handleCountryChange(newCode: string) {
    const newCountry = COUNTRIES.find(x => x.code === newCode)
    const oldDialCode = prevDialCode.current
    if (newCountry) {
      if (!phoneRaw || phoneRaw === oldDialCode) {
        setPhoneRaw(newCountry.dialCode)
      }
      prevDialCode.current = newCountry.dialCode
    }
    setCountry(newCode)
  }

  function handleNpwpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
    setNpwpRaw(digits)
  }

  function toggleRole(r: ContactRole) {
    setRoles((prev) => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }

  const addrPreview = isIndonesia
    ? formatIndonesianAddress({ line1: addrLine1, line2: addrLine2, rt: addrRt, rw: addrRw, kelurahan: addrKelurahan, kecamatan: addrKecamatan, kota: addrKota, provinsi: addrProvinsi, kodePos: addrKodePos })
    : ''

  async function save() {
    if (!name.trim()) { setError('Nama wajib diisi.'); return }
    setSaving(true); setError(null)

    const payload = {
      type, name: name.trim(),
      parentId: type === 'individual' ? (parentId || null) : null,
      addressType: type === 'individual' ? addressType : null,
      email: email.trim() || null,
      phone: phoneRaw.trim() || null,
      npwp: npwpDisplay || null,
      notes: notes.trim() || null,
      userId: userId || null,
      roles: Array.from(roles),
      isPkp,
      website: website.trim() || null,
      language: language || null,
      country: country || null,
      address: !isIndonesia ? (address.trim() || null) : null,
      addrLine1: isIndonesia ? (addrLine1.trim() || null) : null,
      addrLine2: isIndonesia ? (addrLine2.trim() || null) : null,
      addrRt: isIndonesia ? (addrRt.trim() || null) : null,
      addrRw: isIndonesia ? (addrRw.trim() || null) : null,
      addrKelurahan: isIndonesia ? (addrKelurahan.trim() || null) : null,
      addrKecamatan: isIndonesia ? (addrKecamatan.trim() || null) : null,
      addrKota: isIndonesia ? (addrKota.trim() || null) : null,
      addrProvinsi: isIndonesia ? (addrProvinsi.trim() || null) : null,
      addrKodePos: isIndonesia ? (addrKodePos.trim() || null) : null,
    }

    const res = isEdit
      ? await fetch(`/api/contacts/${initial!.contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data.contact) {
      const linkedUser = userId ? members.find((m) => m.id === userId) ?? null : null
      const row: ContactRow = { contact: data.contact, roles: Array.from(roles), linkedUser, paymentTermsLabel: null, pricelistLabel: null }
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

      {/* Section: Identity */}
      <SectionTitle>Identitas</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Tipe">
          <select value={type} onChange={(e) => setType(e.target.value as ContactType)} style={inputStyle}>
            <option value="individual">Perorangan</option>
            <option value="company">Perusahaan</option>
          </select>
        </Field>
        <Field label="Nama *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'company' ? 'PT Maju Jaya' : 'Budi Santoso'} style={inputStyle} />
        </Field>
        {type === 'individual' && (
          <>
            <Field label="Induk Perusahaan">
              <select
                value={parentId}
                onChange={(e) => {
                  const pid = e.target.value
                  setParentId(pid)
                  if (pid) {
                    const co = companies.find((x) => x.contact.id === pid)
                    if (co) {
                      // Auto-fill country if not set
                      if (!country && co.contact.country) setCountry(co.contact.country)
                      // Auto-fill address fields if all empty
                      if (!addrLine1 && !addrKota && !addrProvinsi) {
                        if (co.contact.addrLine1) setAddrLine1(co.contact.addrLine1)
                        if (co.contact.addrLine2) setAddrLine2(co.contact.addrLine2)
                        if (co.contact.addrRt) setAddrRt(co.contact.addrRt)
                        if (co.contact.addrRw) setAddrRw(co.contact.addrRw)
                        if (co.contact.addrKelurahan) setAddrKelurahan(co.contact.addrKelurahan)
                        if (co.contact.addrKecamatan) setAddrKecamatan(co.contact.addrKecamatan)
                        if (co.contact.addrKota) setAddrKota(co.contact.addrKota)
                        if (co.contact.addrProvinsi) setAddrProvinsi(co.contact.addrProvinsi)
                        if (co.contact.addrKodePos) setAddrKodePos(co.contact.addrKodePos)
                      }
                    }
                  }
                }}
                style={inputStyle}
              >
                <option value="">— Tanpa induk —</option>
                {companies
                  .filter((co) => co.contact.id !== initial?.contact.id)
                  .map((co) => <option key={co.contact.id} value={co.contact.id}>{co.contact.name}</option>)}
              </select>
            </Field>
            <Field label="Tipe Alamat">
              <select value={addressType} onChange={(e) => setAddressType(e.target.value as ContactAddressType)} style={inputStyle}>
                {(Object.keys(ADDR_TYPE_LABEL) as ContactAddressType[]).map((at) => (
                  <option key={at} value={at}>{ADDR_TYPE_LABEL[at]}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field label="Negara">
          <select value={country} onChange={(e) => handleCountryChange(e.target.value)} style={inputStyle}>
            <option value="">— Pilih negara —</option>
            {COUNTRIES.map((co) => (
              <option key={co.code} value={co.code}>{co.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Bahasa">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
            <option value="">— Pilih bahasa —</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Section: Kontak */}
      <SectionTitle>Kontak</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opsional" style={inputStyle} />
        </Field>
        <Field label={`Telepon${country ? ` (${COUNTRIES.find(x => x.code === country)?.dialCode ?? ''})` : ''}`}>
          <input
            value={phoneRaw}
            onChange={(e) => setPhoneRaw(e.target.value)}
            onFocus={() => { if (!phoneRaw && country) { const co = COUNTRIES.find(x => x.code === country); if (co) setPhoneRaw(co.dialCode) } }}
            placeholder="+62…"
            style={inputStyle}
          />
        </Field>
        <Field label="Website">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            style={inputStyle}
          />
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

      {/* Section: Pajak */}
      <SectionTitle>Pajak</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
        <Field label={`NPWP${npwpRaw.length === 16 ? ' (NPWP16 / NIK)' : npwpRaw.length > 0 ? ' (format lama)' : ''}`}>
          <input
            value={npwpDisplay}
            onChange={handleNpwpChange}
            placeholder="Ketik 15 atau 16 angka"
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
          />
        </Field>
        <Field label="Status PKP">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPkp}
              onChange={(e) => setIsPkp(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--teal)', cursor: 'pointer' }}
            />
            <span style={{ font: '400 13px/1 var(--font-sans)', color: isPkp ? 'var(--teal)' : 'var(--fg-2)' }}>
              {isPkp ? 'PKP (Pengusaha Kena Pajak)' : 'Bukan PKP'}
            </span>
          </label>
        </Field>
      </div>

      {/* Section: Alamat */}
      <SectionTitle>Alamat</SectionTitle>

      {isIndonesia ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            <Field label="Jalan / Nama Gedung / Perumahan">
              <input value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} placeholder="Jl. Sudirman No. 1, Gedung ABC" style={inputStyle} />
            </Field>
            <Field label="Alamat Baris 2 (opsional)">
              <input value={addrLine2} onChange={(e) => setAddrLine2(e.target.value)} placeholder="Lantai 5, Unit B" style={inputStyle} />
            </Field>
            <Field label="RT">
              <input value={addrRt} onChange={(e) => setAddrRt(e.target.value)} placeholder="001" style={inputStyle} />
            </Field>
            <Field label="RW">
              <input value={addrRw} onChange={(e) => setAddrRw(e.target.value)} placeholder="005" style={inputStyle} />
            </Field>
            <Field label="Kelurahan / Desa">
              <input value={addrKelurahan} onChange={(e) => setAddrKelurahan(e.target.value)} placeholder="Kelurahan Menteng" style={inputStyle} />
            </Field>
            <Field label="Kecamatan">
              <input value={addrKecamatan} onChange={(e) => setAddrKecamatan(e.target.value)} placeholder="Kecamatan Menteng" style={inputStyle} />
            </Field>
            <Field label="Kota / Kabupaten">
              <input value={addrKota} onChange={(e) => setAddrKota(e.target.value)} placeholder="Jakarta Pusat" style={inputStyle} />
            </Field>
            <Field label="Kode Pos">
              <input value={addrKodePos} onChange={(e) => setAddrKodePos(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="10310" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} maxLength={5} />
            </Field>
          </div>
          <Field label="Provinsi">
            <input value={addrProvinsi} onChange={(e) => setAddrProvinsi(e.target.value)} placeholder="DKI Jakarta" style={inputStyle} />
          </Field>
          {addrPreview && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(15,123,108,0.05)', border: '1px solid rgba(15,123,108,0.15)', borderRadius: 'var(--r-sm)', font: '12px/1.6 var(--font-sans)', color: 'var(--fg-2)' }}>
              <span style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Pratinjau format resmi</span>
              {addrPreview}
            </div>
          )}
        </>
      ) : (
        <Field label="Alamat">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
          />
        </Field>
      )}

      {/* Section: Catatan */}
      <SectionTitle>Catatan & Peran</SectionTitle>
      <Field label="Catatan">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 'var(--s-4)', marginBottom: 4, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
      {children}
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
