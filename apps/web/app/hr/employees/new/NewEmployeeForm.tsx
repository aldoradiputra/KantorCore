'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Department } from '@kantorcore/db'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</label>
      {children}
      {hint && <span style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</span>}
    </div>
  )
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

export function NewEmployeeForm({ departments }: { departments: Department[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [employmentType, setEmploymentType] = useState('full_time')
  const [hireDate, setHireDate] = useState('')
  const [nik, setNik] = useState('')
  const [npwp, setNpwp] = useState('')
  const [bpjsKetenagakerjaan, setBpjsKetenagakerjaan] = useState('')
  const [bpjsKesehatan, setBpjsKesehatan] = useState('')
  const [notes, setNotes] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/hr/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, employeeCode, email, phone, position,
        departmentId: departmentId || null,
        employmentType, hireDate: hireDate || null,
        nik, npwp, bpjsKetenagakerjaan, bpjsKesehatan, notes,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/hr/employees/${data.employee.id}`)
      return
    }
    const data = await res.json().catch(() => ({ error: 'Gagal menyimpan.' }))
    setError(data.error ?? 'Gagal menyimpan.')
    setPending(false)
  }

  const sectionTitle = (t: string) => (
    <div
      style={{
        font: '600 11px/1 var(--font-sans)',
        color: 'var(--fg-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        paddingBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {t}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-6)' }}>
          Tambah Karyawan
        </h1>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--r-sm)',
              font: '13px/1.4 var(--font-sans)',
              color: '#b91c1c',
              marginBottom: 'var(--s-4)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          {sectionTitle('Info Dasar')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
            <Field label="Nama lengkap *">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Kode karyawan" hint="Contoh: EMP-001">
              <input style={inputStyle} value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />
            </Field>
            <Field label="Email">
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Telepon">
              <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Jabatan">
              <input style={inputStyle} value={position} onChange={(e) => setPosition(e.target.value)} />
            </Field>
            <Field label="Departemen">
              <select
                style={{ ...inputStyle, paddingRight: 8 }}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">— Pilih departemen —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Tipe pekerjaan">
              <select
                style={{ ...inputStyle, paddingRight: 8 }}
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                <option value="full_time">Penuh Waktu</option>
                <option value="part_time">Paruh Waktu</option>
                <option value="contract">Kontrak</option>
                <option value="intern">Magang</option>
              </select>
            </Field>
            <Field label="Tanggal bergabung">
              <input style={inputStyle} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </Field>
          </div>

          {sectionTitle('Data Legal Indonesia')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
            <Field label="NIK" hint="16 digit Nomor Induk Kependudukan">
              <input style={inputStyle} value={nik} onChange={(e) => setNik(e.target.value)} maxLength={16} />
            </Field>
            <Field label="NPWP" hint="Nomor Pokok Wajib Pajak">
              <input style={inputStyle} value={npwp} onChange={(e) => setNpwp(e.target.value)} />
            </Field>
            <Field label="BPJS Ketenagakerjaan">
              <input style={inputStyle} value={bpjsKetenagakerjaan} onChange={(e) => setBpjsKetenagakerjaan(e.target.value)} />
            </Field>
            <Field label="BPJS Kesehatan">
              <input style={inputStyle} value={bpjsKesehatan} onChange={(e) => setBpjsKesehatan(e.target.value)} />
            </Field>
          </div>

          {sectionTitle('Catatan')}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{
              padding: '8px 10px',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              font: '13px/1.5 var(--font-sans)',
              color: 'var(--fg-1)',
              background: 'var(--bg-1)',
              resize: 'vertical',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 'var(--s-3)', paddingTop: 'var(--s-2)' }}>
            <button
              type="submit"
              disabled={pending}
              style={{
                height: 36,
                padding: '0 20px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--indigo)',
                color: '#fff',
                font: '500 13px/1 var(--font-sans)',
                border: 'none',
                cursor: pending ? 'not-allowed' : 'pointer',
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? 'Menyimpan…' : 'Simpan Karyawan'}
            </button>
            <a
              href="/hr/employees"
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg-2)',
                font: '500 13px/1 var(--font-sans)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Batal
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
