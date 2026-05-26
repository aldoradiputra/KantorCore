'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { EmployeeWithDept } from '../../../../lib/hr'
import { EMPLOYMENT_TYPE_LABEL, EMPLOYEE_STATUS_LABEL } from '../../../../lib/hr'
import type { Department } from '@kantorcore/db'

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--teal)',
  inactive: 'var(--fg-3)',
  terminated: '#c0392b',
}

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg-1)',
  width: '100%',
  boxSizing: 'border-box',
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ font: '13px/1.4 var(--font-sans)', color: value ? 'var(--fg-1)' : 'var(--fg-3)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

export function EmployeeDetail({
  employee: initialEmployee,
  departments,
}: {
  employee: EmployeeWithDept
  departments: Department[]
}) {
  const router = useRouter()
  const [employee, setEmployee] = useState(initialEmployee)
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Edit form state mirrors employee fields
  const [name, setName] = useState(employee.name)
  const [employeeCode, setEmployeeCode] = useState(employee.employeeCode ?? '')
  const [email, setEmail] = useState(employee.email ?? '')
  const [phone, setPhone] = useState(employee.phone ?? '')
  const [position, setPosition] = useState(employee.position ?? '')
  const [departmentId, setDepartmentId] = useState(employee.departmentId ?? '')
  const [employmentType, setEmploymentType] = useState(employee.employmentType)
  const [status, setStatus] = useState(employee.status)
  const [hireDate, setHireDate] = useState(employee.hireDate ?? '')
  const [terminationDate, setTerminationDate] = useState(employee.terminationDate ?? '')
  const [nik, setNik] = useState(employee.nik ?? '')
  const [npwp, setNpwp] = useState(employee.npwp ?? '')
  const [bpjsKetenagakerjaan, setBpjsKetenagakerjaan] = useState(employee.bpjsKetenagakerjaan ?? '')
  const [bpjsKesehatan, setBpjsKesehatan] = useState(employee.bpjsKesehatan ?? '')
  const [notes, setNotes] = useState(employee.notes ?? '')

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch(`/api/hr/employees/${employee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, employeeCode, email, phone, position,
        departmentId: departmentId || null,
        employmentType, status,
        hireDate: hireDate || null,
        terminationDate: terminationDate || null,
        nik, npwp, bpjsKetenagakerjaan, bpjsKesehatan, notes,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Gagal menyimpan.')
      setPending(false)
      return
    }
    setEmployee({ ...data.employee, departmentName: departments.find((d) => d.id === data.employee.departmentId)?.name ?? null })
    setEditing(false)
    setPending(false)
  }

  async function onDelete() {
    if (!confirm(`Hapus karyawan "${employee.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeleting(true)
    await fetch(`/api/hr/employees/${employee.id}`, { method: 'DELETE' })
    router.push('/hr/employees')
  }

  const avatarInitials = employee.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s-4)', marginBottom: 'var(--s-6)' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--indigo-light)',
              color: 'var(--indigo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              font: '600 18px/1 var(--font-sans)',
              flexShrink: 0,
            }}
          >
            {avatarInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 4px' }}>
              {employee.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {employee.position && (
                <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{employee.position}</span>
              )}
              {employee.departmentName && (
                <>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{employee.departmentName}</span>
                </>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  font: '12px/1 var(--font-sans)',
                  color: STATUS_COLOR[employee.status] ?? 'var(--fg-3)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[employee.status] ?? 'var(--fg-3)' }} />
                {EMPLOYEE_STATUS_LABEL[employee.status]}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexShrink: 0 }}>
            {!editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface)',
                    color: 'var(--fg-1)',
                    font: '500 13px/1 var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    font: '500 13px/1 var(--font-sans)',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deleting ? 'Menghapus…' : 'Hapus'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#b91c1c', marginBottom: 'var(--s-4)' }}>
            {error}
          </div>
        )}

        {editing ? (
          <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
              {[
                { label: 'Nama *', val: name, set: setName, type: 'text', required: true },
                { label: 'Kode karyawan', val: employeeCode, set: setEmployeeCode, type: 'text' },
                { label: 'Email', val: email, set: setEmail, type: 'email' },
                { label: 'Telepon', val: phone, set: setPhone, type: 'tel' },
                { label: 'Jabatan', val: position, set: setPosition, type: 'text' },
              ].map(({ label, val, set, type, required }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
                  <input style={inputStyle} type={type} value={val} onChange={(e) => set(e.target.value)} required={required} />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Departemen</label>
                <select style={{ ...inputStyle, paddingRight: 8 }} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">— Pilih —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Tipe pekerjaan</label>
                <select style={{ ...inputStyle, paddingRight: 8 }} value={employmentType} onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)}>
                  <option value="full_time">Penuh Waktu</option>
                  <option value="part_time">Paruh Waktu</option>
                  <option value="contract">Kontrak</option>
                  <option value="intern">Magang</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Status</label>
                <select style={{ ...inputStyle, paddingRight: 8 }} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="terminated">Diberhentikan</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Tanggal bergabung</label>
                <input style={inputStyle} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Tanggal berakhir</label>
                <input style={inputStyle} type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} />
              </div>
            </div>

            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              Data Legal Indonesia
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
              {[
                { label: 'NIK', val: nik, set: setNik },
                { label: 'NPWP', val: npwp, set: setNpwp },
                { label: 'BPJS Ketenagakerjaan', val: bpjsKetenagakerjaan, set: setBpjsKetenagakerjaan },
                { label: 'BPJS Kesehatan', val: bpjsKesehatan, set: setBpjsKesehatan },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
                  <input style={inputStyle} value={val} onChange={(e) => set(e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Catatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--bg-1)', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <button type="submit" disabled={pending} style={{ height: 36, padding: '0 20px', borderRadius: 'var(--r-sm)', background: 'var(--indigo)', color: '#fff', font: '500 13px/1 var(--font-sans)', border: 'none', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1 }}>
                {pending ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
              <button type="button" onClick={() => setEditing(false)} style={{ height: 36, padding: '0 16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--fg-2)', font: '500 13px/1 var(--font-sans)', cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}>
            {/* Info grid */}
            <section>
              <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
                Info Karyawan
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-5)' }}>
                <InfoRow label="Kode" value={employee.employeeCode} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="Telepon" value={employee.phone} />
                <InfoRow label="Jabatan" value={employee.position} />
                <InfoRow label="Departemen" value={employee.departmentName} />
                <InfoRow label="Tipe" value={EMPLOYMENT_TYPE_LABEL[employee.employmentType]} />
                <InfoRow
                  label="Bergabung"
                  value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                />
                <InfoRow
                  label="Berakhir"
                  value={employee.terminationDate ? new Date(employee.terminationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                />
              </div>
            </section>

            {/* Legal */}
            {(employee.nik || employee.npwp || employee.bpjsKetenagakerjaan || employee.bpjsKesehatan) && (
              <section>
                <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
                  Data Legal Indonesia
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-5)' }}>
                  <InfoRow label="NIK" value={employee.nik} />
                  <InfoRow label="NPWP" value={employee.npwp} />
                  <InfoRow label="BPJS Ketenagakerjaan" value={employee.bpjsKetenagakerjaan} />
                  <InfoRow label="BPJS Kesehatan" value={employee.bpjsKesehatan} />
                </div>
              </section>
            )}

            {employee.notes && (
              <section>
                <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
                  Catatan
                </div>
                <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {employee.notes}
                </p>
              </section>
            )}

            <section style={{ paddingTop: 'var(--s-3)', borderTop: '1px solid var(--border)' }}>
              <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
                Penggajian
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
                <Link href={`/hr/employees/${employee.id}/salary`}
                  style={{ padding: '7px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--indigo)', color: 'var(--indigo)', font: '500 13px/1 var(--font-sans)', textDecoration: 'none', display: 'inline-block' }}>
                  Pengaturan Gaji & BPJS →
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
