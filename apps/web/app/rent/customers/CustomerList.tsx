'use client'

import { useState } from 'react'
import type { RentCustomer } from '@kantorcore/db'

const inputStyle: React.CSSProperties = {
  height: 32,
  padding: '0 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg-1)',
}

export function CustomerList({ initialCustomers }: { initialCustomers: RentCustomer[] }) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('individual')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await fetch('/api/rent/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, customerType: type, email, phone, idNumber, address }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Gagal membuat pelanggan.')
      setPending(false)
      return
    }
    setCustomers((prev) => [...prev, data.customer].sort((a, b) => a.name.localeCompare(b.name)))
    setName(''); setEmail(''); setPhone(''); setIdNumber(''); setAddress('')
    setShowForm(false)
    setPending(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-4)' }}>
          <h1 style={{ font: '600 18px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Pelanggan
            <span style={{ font: '400 13px/1 var(--font-sans)', color: 'var(--fg-3)', marginLeft: 8 }}>
              {customers.length}
            </span>
          </h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                height: 32, padding: '0 12px', borderRadius: 'var(--r-sm)',
                background: 'var(--indigo)', color: '#fff', border: 'none',
                font: '500 13px/1 var(--font-sans)', cursor: 'pointer',
              }}
            >
              + Tambah Pelanggan
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={onCreate} style={{ marginBottom: 'var(--s-5)', padding: 'var(--s-4)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: '#b91c1c' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--s-3)' }}>
              <input style={inputStyle} placeholder="Nama *" value={name} onChange={(e) => setName(e.target.value)} required />
              <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="individual">Perorangan</option>
                <option value="business">Bisnis</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
              <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input style={inputStyle} placeholder="Telepon" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <input style={inputStyle} placeholder={type === 'business' ? 'NPWP' : 'NIK'} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            <input style={inputStyle} placeholder="Alamat" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <button
                type="submit"
                disabled={pending || !name.trim()}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 'var(--r-sm)',
                  background: 'var(--indigo)', color: '#fff', border: 'none',
                  font: '500 13px/1 var(--font-sans)',
                  cursor: pending || !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: pending || !name.trim() ? 0.6 : 1,
                }}
              >
                {pending ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--fg-2)',
                  font: '500 13px/1 var(--font-sans)', cursor: 'pointer',
                }}
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {customers.length === 0 ? (
          <p style={{ font: '14px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            Belum ada pelanggan. Tambahkan pelanggan pertama atau buat langsung dari form reservasi.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nama', 'Tipe', 'Telepon', 'Email'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{c.name}</td>
                  <td style={{ padding: '10px 12px', font: '13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {c.customerType === 'business' ? 'Bisnis' : 'Perorangan'}
                  </td>
                  <td style={{ padding: '10px 12px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{c.phone ?? '—'}</td>
                  <td style={{ padding: '10px 12px', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{c.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
