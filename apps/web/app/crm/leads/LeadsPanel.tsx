'use client'

import { useState, useMemo, useTransition } from 'react'
import type { Lead, LeadStatus } from '../../../lib/crm-teams'

const STATUS_LABEL: Record<LeadStatus, string> = {
  new:          'Baru',
  contacted:    'Dihubungi',
  qualified:    'Terverifikasi',
  disqualified: 'Didiskualifikasi',
  converted:    'Dikonversi',
}

const STATUS_COLOR: Record<LeadStatus, { bg: string; fg: string }> = {
  new:          { bg: 'var(--indigo-light)', fg: 'var(--indigo)' },
  contacted:    { bg: '#FEF3C7', fg: '#92400E' },
  qualified:    { bg: '#D1FAE5', fg: '#065F46' },
  disqualified: { bg: '#FEE2E2', fg: '#991B1B' },
  converted:    { bg: '#EDE9FE', fg: '#5B21B6' },
}

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'disqualified', 'converted']

interface Props {
  initialLeads: Lead[]
  total: number
  teams: { id: string; name: string }[]
}

export default function LeadsPanel({ initialLeads, total, teams }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('')
  const [filterTeam, setFilterTeam] = useState<string>('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // New lead form state
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    companyName: '', jobTitle: '', industry: '', location: '',
    employeeCount: '', utmSource: '', utmMedium: '', utmCampaign: '',
    assignedTeamId: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let rows = leads
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((l) =>
        `${l.firstName} ${l.lastName ?? ''} ${l.email ?? ''} ${l.companyName ?? ''}`.toLowerCase().includes(q)
      )
    }
    if (filterStatus) rows = rows.filter((l) => l.leadStatus === filterStatus)
    if (filterTeam)   rows = rows.filter((l) => l.assignedTeamId === filterTeam)
    return rows
  }, [leads, search, filterStatus, filterTeam])

  async function handleStatusChange(leadId: string, status: LeadStatus) {
    startTransition(async () => {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const { lead } = await res.json()
        setLeads((prev) => prev.map((l) => l.id === leadId ? lead : l))
      }
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          employeeCount: form.employeeCount ? Number(form.employeeCount) : null,
          assignedTeamId: form.assignedTeamId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Gagal membuat lead.'); return }
      setLeads((prev) => [data.lead, ...prev])
      setShowNewForm(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', companyName: '', jobTitle: '', industry: '', location: '', employeeCount: '', utmSource: '', utmMedium: '', utmCampaign: '', assignedTeamId: '', notes: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Lead</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            {filtered.length} dari {total} lead
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: 'pointer' }}
        >
          + Lead Baru
        </button>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Cari lead…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 160, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', outline: 'none' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | '')}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', background: 'var(--surface)', cursor: 'pointer' }}
        >
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {teams.length > 0 && (
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            <option value="">Semua Tim</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Status summary chips */}
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', flexShrink: 0 }}>
        {STATUSES.map((s) => {
          const count = leads.filter((l) => l.leadStatus === s).length
          const colors = STATUS_COLOR[s]
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                background: filterStatus === s ? colors.bg : 'var(--bg)',
                color: filterStatus === s ? colors.fg : 'var(--fg-3)',
                font: '12px/1 var(--font-sans)',
                cursor: 'pointer',
                fontWeight: filterStatus === s ? 600 : 400,
              }}
            >
              {STATUS_LABEL[s]} {count}
            </button>
          )
        })}
      </div>

      {/* Lead table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              {['#', 'Nama', 'Perusahaan', 'Email / Telepon', 'Sumber', 'Tim', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--fg-3)' }}>Tidak ada lead ditemukan.</td></tr>
            ) : (
              filtered.map((lead) => {
                const colors = STATUS_COLOR[lead.leadStatus]
                const team = teams.find((t) => t.id === lead.assignedTeamId)
                return (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--fg-3)', font: '11px/1 var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>{lead.leadNumber}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                        {lead.firstName} {lead.lastName ?? ''}
                      </div>
                      {lead.jobTitle && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{lead.jobTitle}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>
                      {lead.companyName ?? '—'}
                      {lead.industry && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{lead.industry}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {lead.email && <div style={{ color: 'var(--fg-2)' }}>{lead.email}</div>}
                      {lead.phone && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{lead.phone}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {lead.utmSource ? (
                        <div>
                          <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{lead.utmSource}</div>
                          {lead.utmCampaign && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>{lead.utmCampaign}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-3)', font: '12px/1' }}>{team?.name ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={lead.leadStatus}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        disabled={isPending}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--r-sm)',
                          border: 'none',
                          background: colors.bg,
                          color: colors.fg,
                          font: '12px/1 var(--font-sans)',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {lead.leadStatus === 'qualified' && (
                        <a
                          href={`/crm/deals/new?leadId=${lead.id}&name=${encodeURIComponent(`${lead.firstName} ${lead.lastName ?? ''}`.trim())}&company=${encodeURIComponent(lead.companyName ?? '')}`}
                          style={{ font: '12px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          → Deal
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Lead drawer */}
      {showNewForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        }} onClick={() => setShowNewForm(false)}>
          <div
            style={{ width: 480, height: '100%', background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,.12)', overflowY: 'auto', padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Lead Baru</h2>
              <button onClick={() => setShowNewForm(false)} style={{ border: 'none', background: 'transparent', font: '18px/1 var(--font-sans)', color: 'var(--fg-3)', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
                <Field label="Nama Depan *" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} required />
                <Field label="Nama Belakang" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
                <Field label="Telepon" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
                <Field label="Perusahaan" value={form.companyName} onChange={(v) => setForm((f) => ({ ...f, companyName: v }))} />
                <Field label="Jabatan" value={form.jobTitle} onChange={(v) => setForm((f) => ({ ...f, jobTitle: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
                <Field label="Industri" value={form.industry} onChange={(v) => setForm((f) => ({ ...f, industry: v }))} />
                <Field label="Lokasi" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
              </div>
              <Field label="Jumlah Karyawan" type="number" value={form.employeeCount} onChange={(v) => setForm((f) => ({ ...f, employeeCount: v }))} />

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s-3)' }}>
                <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 'var(--s-2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Atribusi</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-2)' }}>
                  <Field label="UTM Source" value={form.utmSource} onChange={(v) => setForm((f) => ({ ...f, utmSource: v }))} />
                  <Field label="UTM Medium" value={form.utmMedium} onChange={(v) => setForm((f) => ({ ...f, utmMedium: v }))} />
                  <Field label="UTM Campaign" value={form.utmCampaign} onChange={(v) => setForm((f) => ({ ...f, utmCampaign: v }))} />
                </div>
              </div>

              {teams.length > 0 && (
                <div>
                  <label style={{ display: 'block', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>Tim Sales</label>
                  <select
                    value={form.assignedTeamId}
                    onChange={(e) => setForm((f) => ({ ...f, assignedTeamId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)' }}
                  >
                    <option value="">— Belum ditugaskan —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {formError && (
                <div style={{ padding: '8px 12px', background: '#FEE2E2', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: '#991B1B' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--s-2)', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowNewForm(false)} style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--surface)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={saving} style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Menyimpan…' : 'Simpan Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label style={{ display: 'block', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', boxSizing: 'border-box' }}
      />
    </div>
  )
}
