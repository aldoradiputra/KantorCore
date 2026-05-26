'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmployeeSalarySettings } from '@kantorcore/db'

type Settings = EmployeeSalarySettings | null

export function SalarySettingsForm({
  employeeId,
  initialSettings,
}: {
  employeeId: string
  initialSettings: Settings
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [baseSalary, setBaseSalary] = useState(initialSettings?.baseSalary ?? 0)
  const [ptkpStatus, setPtkpStatus] = useState<string>(initialSettings?.ptkpStatus ?? 'TK0')
  const [taxScheme, setTaxScheme] = useState<string>(initialSettings?.taxScheme ?? 'gross')
  const [jkkTier, setJkkTier] = useState<string>(initialSettings?.jkkTier ?? 'very_low')
  const [bpjsKesEnabled, setBpjsKesEnabled] = useState(
    initialSettings?.bpjsKesEnabled !== false,
  )
  const [bpjsKetEnabled, setBpjsKetEnabled] = useState(
    initialSettings?.bpjsKetEnabled !== false,
  )
  const [jpEnabled, setJpEnabled] = useState(initialSettings?.jpEnabled !== false)
  const [fixedAllowances, setFixedAllowances] = useState<
    { name: string; amount: number }[]
  >((initialSettings?.fixedAllowances as { name: string; amount: number }[]) ?? [])
  const [effectiveDate, setEffectiveDate] = useState(
    initialSettings?.effectiveDate ?? today,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function addAllowance() {
    setFixedAllowances((a) => [...a, { name: '', amount: 0 }])
  }
  function removeAllowance(i: number) {
    setFixedAllowances((a) => a.filter((_, idx) => idx !== i))
  }
  function updateAllowance(
    i: number,
    patch: Partial<{ name: string; amount: number }>,
  ) {
    setFixedAllowances((a) =>
      a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    )
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch(`/api/pay/salary-settings/${employeeId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        baseSalary,
        ptkpStatus,
        taxScheme,
        jkkTier,
        bpjsKesEnabled,
        bpjsKetEnabled,
        jpEnabled,
        fixedAllowances,
        effectiveDate,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError((j as { error?: string }).error ?? 'Gagal menyimpan.')
    } else {
      setSaved(true)
      router.refresh()
    }
    setSaving(false)
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
  const selectStyle = { ...inputStyle }

  return (
    <form
      onSubmit={onSave}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      {/* Gaji Pokok */}
      <Field label="Gaji Pokok (IDR)">
        <input
          style={inputStyle}
          type="number"
          min={0}
          value={baseSalary}
          onChange={(e) => setBaseSalary(parseInt(e.target.value || '0', 10))}
        />
      </Field>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 'var(--s-3)',
        }}
      >
        <Field label="Status PTKP">
          <select
            style={selectStyle}
            value={ptkpStatus}
            onChange={(e) => setPtkpStatus(e.target.value)}
          >
            {['TK0', 'TK1', 'TK2', 'TK3', 'K0', 'K1', 'K2', 'K3'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Skema Pajak">
          <select
            style={selectStyle}
            value={taxScheme}
            onChange={(e) => setTaxScheme(e.target.value)}
          >
            <option value="gross">Gross</option>
            <option value="gross_up">Gross Up</option>
            <option value="net">Net</option>
          </select>
        </Field>
        <Field label="Risiko JKK">
          <select
            style={selectStyle}
            value={jkkTier}
            onChange={(e) => setJkkTier(e.target.value)}
          >
            <option value="very_low">Sangat Rendah (0.24%)</option>
            <option value="low">Rendah (0.54%)</option>
            <option value="medium">Sedang (0.89%)</option>
            <option value="high">Tinggi (1.27%)</option>
            <option value="very_high">Sangat Tinggi (1.74%)</option>
          </select>
        </Field>
      </div>

      {/* BPJS toggles */}
      <div style={{ display: 'flex', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
        <Toggle
          label="BPJS Kesehatan"
          checked={bpjsKesEnabled}
          onChange={setBpjsKesEnabled}
        />
        <Toggle
          label="BPJS Ketenagakerjaan"
          checked={bpjsKetEnabled}
          onChange={setBpjsKetEnabled}
        />
        <Toggle
          label="Jaminan Pensiun (JP)"
          checked={jpEnabled}
          onChange={setJpEnabled}
        />
      </div>

      {/* Fixed allowances */}
      <div>
        <div
          style={{
            font: '600 12px/1 var(--font-sans)',
            color: 'var(--fg-2)',
            marginBottom: 8,
          }}
        >
          Tunjangan Tetap
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fixedAllowances.map((a, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 28px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                style={inputStyle}
                value={a.name}
                onChange={(e) => updateAllowance(i, { name: e.target.value })}
                placeholder="Nama tunjangan"
              />
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={a.amount}
                onChange={(e) =>
                  updateAllowance(i, {
                    amount: parseInt(e.target.value || '0', 10),
                  })
                }
                placeholder="IDR"
              />
              <button
                type="button"
                onClick={() => removeAllowance(i)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--fg-3)',
                  cursor: 'pointer',
                  font: '16px/1 sans-serif',
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAllowance}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '4px 10px',
              font: '500 12px/1 var(--font-sans)',
              color: 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            + Tambah Tunjangan Tetap
          </button>
        </div>
      </div>

      <Field label="Tanggal Berlaku">
        <input
          style={inputStyle}
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />
      </Field>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--r-sm)',
            background: '#fee',
            color: '#c33',
            font: '13px/1.4 var(--font-sans)',
          }}
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--r-sm)',
            background: '#D1FAE5',
            color: '#065F46',
            font: '13px/1.4 var(--font-sans)',
          }}
        >
          Tersimpan.
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--r-md)',
            background: 'var(--indigo)',
            color: 'white',
            font: '600 13px/1 var(--font-sans)',
            border: 'none',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Menyimpan…' : 'Simpan Pengaturan Gaji'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        font: '13px/1.4 var(--font-sans)',
        color: 'var(--fg-2)',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}
