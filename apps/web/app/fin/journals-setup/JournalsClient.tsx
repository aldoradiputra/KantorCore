'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Journal } from '@kantorcore/db'

interface Props {
  journals: Journal[]
  typeLabels: Record<string, string>
}

const JOURNAL_TYPES = ['sale', 'purchase', 'bank', 'cash', 'general'] as const

const EMPTY_FORM = {
  code: '',
  name: '',
  type: 'general' as string,
  currencyCode: 'IDR',
  sequencePrefix: '',
  isDefault: false,
}

export function JournalsClient({ journals, typeLabels }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleChange(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const payload = {
      code: form.code.toUpperCase().trim(),
      name: form.name.trim(),
      type: form.type,
      currencyCode: form.currencyCode.trim() || 'IDR',
      sequencePrefix: form.sequencePrefix.trim() || null,
      isDefault: form.isDefault,
    }

    if (!payload.code) { setError('Kode jurnal wajib diisi.'); return }
    if (!/^[A-Z0-9]{2,5}$/.test(payload.code)) { setError('Kode harus 2–5 karakter huruf kapital/angka.'); return }
    if (!payload.name) { setError('Nama jurnal wajib diisi.'); return }

    const res = await fetch('/api/fin/journals-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError((body as { error?: string }).error ?? 'Terjadi kesalahan.')
      return
    }

    setSuccess(`Jurnal "${payload.name}" berhasil ditambahkan.`)
    setForm(EMPTY_FORM)
    setShowForm(false)
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {/* Table */}
      {journals.length === 0 ? (
        <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center', font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
          Belum ada jurnal. Tambahkan jurnal pertama atau gunakan seed default di halaman Setup.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Tipe</Th>
                <Th>Mata Uang</Th>
                <Th>Prefix</Th>
                <Th>Default</Th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-2)', fontSize: 12 }}>
                      {j.code}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{j.name}</span>
                  </Td>
                  <Td>
                    <TypeBadge type={j.type} label={typeLabels[j.type] ?? j.type} />
                  </Td>
                  <Td>{j.currencyCode}</Td>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-3)', fontSize: 12 }}>
                      {j.sequencePrefix ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    {j.isDefault ? (
                      <span style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '3px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Default
                      </span>
                    ) : (
                      <span style={{ color: 'var(--fg-3)' }}>—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div style={{ padding: '10px 14px', background: 'var(--teal-light, #e6f4f1)', border: '1px solid var(--teal)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--teal)' }}>
          {success}
        </div>
      )}

      {/* Toggle add form */}
      {!showForm ? (
        <div>
          <button
            onClick={() => { setShowForm(true); setSuccess(null) }}
            style={{ padding: '8px 14px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)', cursor: 'pointer' }}
          >
            + Tambah Jurnal
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
        >
          <h2 style={{ font: '600 15px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Tambah Jurnal Baru</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
            <Field label="Kode *">
              <input
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="mis. BANK"
                maxLength={5}
                style={inputStyle}
              />
            </Field>

            <Field label="Nama *">
              <input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="mis. Bank Utama"
                style={inputStyle}
              />
            </Field>

            <Field label="Tipe">
              <select value={form.type} onChange={(e) => handleChange('type', e.target.value)} style={inputStyle}>
                {JOURNAL_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabels[t] ?? t}</option>
                ))}
              </select>
            </Field>

            <Field label="Mata Uang">
              <input
                value={form.currencyCode}
                onChange={(e) => handleChange('currencyCode', e.target.value.toUpperCase())}
                placeholder="IDR"
                maxLength={3}
                style={inputStyle}
              />
            </Field>

            <Field label="Prefix Sequence">
              <input
                value={form.sequencePrefix}
                onChange={(e) => handleChange('sequencePrefix', e.target.value.toUpperCase())}
                placeholder="mis. BNK"
                maxLength={10}
                style={inputStyle}
              />
            </Field>

            <Field label="Default?">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => handleChange('isDefault', e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--indigo)' }}
                />
                Jadikan jurnal default untuk tipe ini
              </label>
            </Field>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={isPending}
              style={{ padding: '8px 16px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? 'Menyimpan…' : 'Simpan Jurnal'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null) }}
              style={{ padding: '8px 14px', background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)', cursor: 'pointer' }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </th>
  )
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--fg-1)' }}>{children}</td>
}

const TYPE_COLOR: Record<string, string> = {
  sale: 'var(--teal)',
  purchase: 'var(--amber)',
  bank: 'var(--indigo)',
  cash: 'var(--indigo)',
  general: 'var(--fg-3)',
}

function TypeBadge({ type, label }: { type: string; label: string }) {
  const color = TYPE_COLOR[type] ?? 'var(--fg-3)'
  return (
    <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
      {label}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}
