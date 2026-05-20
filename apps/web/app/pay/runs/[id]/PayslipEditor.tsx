'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Line {
  kind: 'earning' | 'deduction'
  name: string
  amount: number
}

const inputStyle: React.CSSProperties = {
  height: 30,
  padding: '0 8px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)',
  color: 'var(--fg-1)',
  background: 'var(--bg-1)',
  width: '100%',
  boxSizing: 'border-box',
}

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

const COMMON_EARNINGS = ['Gaji Pokok', 'Tunjangan Tetap', 'Tunjangan Transport', 'Tunjangan Makan', 'Lembur', 'Bonus']
const COMMON_DEDUCTIONS = ['PPh 21', 'BPJS Kesehatan', 'BPJS Ketenagakerjaan', 'Pinjaman Karyawan']

export function PayslipEditor({
  payslipId,
  employeeName,
  position,
  lines: initialLines,
  grossTotal: initialGross,
  deductionTotal: initialDeduction,
  netTotal: initialNet,
  editable,
}: {
  payslipId: string
  employeeName: string
  position: string | null
  lines: Line[]
  grossTotal: number
  deductionTotal: number
  netTotal: number
  editable: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Line[]>(initialLines)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gross = lines.filter((l) => l.kind === 'earning').reduce((s, l) => s + l.amount, 0)
  const deductions = lines.filter((l) => l.kind === 'deduction').reduce((s, l) => s + l.amount, 0)
  const net = gross - deductions

  const displayGross = open ? gross : initialGross
  const displayDed = open ? deductions : initialDeduction
  const displayNet = open ? net : initialNet

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function addLine(kind: 'earning' | 'deduction') {
    const suggestions = kind === 'earning' ? COMMON_EARNINGS : COMMON_DEDUCTIONS
    setLines((ls) => [...ls, { kind, name: suggestions[0] ?? '', amount: 0 }])
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i))
  }

  async function save() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/pay/payslips/${payslipId}/lines`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal menyimpan.')
      setBusy(false)
      return
    }
    setBusy(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: editable ? 'pointer' : 'default' }}
        onClick={() => editable && setOpen(!open)}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{employeeName}</div>
          {position && <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{position}</div>}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s-4)', alignItems: 'center' }}>
          <Mini label="Bruto" value={IDR.format(displayGross)} />
          <Mini label="Potongan" value={IDR.format(displayDed)} />
          <Mini label="Bersih" value={IDR.format(displayNet)} accent />
          {editable && <span style={{ color: 'var(--fg-3)', font: '12px/1 var(--font-sans)' }}>{open ? '▴' : '▾'}</span>}
        </div>
      </div>

      {open && editable && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <Section title="Penghasilan" kind="earning" lines={lines} updateLine={updateLine} removeLine={removeLine} addLine={() => addLine('earning')} suggestions={COMMON_EARNINGS} />
          <Section title="Potongan" kind="deduction" lines={lines} updateLine={updateLine} removeLine={removeLine} addLine={() => addLine('deduction')} suggestions={COMMON_DEDUCTIONS} />

          {error && (
            <div style={{ padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'var(--red-light, #fee)', color: 'var(--red, #c33)', font: '13px/1.4 var(--font-sans)' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <button onClick={save} disabled={busy}
              style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', border: 'none', font: '600 13px/1 var(--font-sans)', cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button onClick={() => { setLines(initialLines); setOpen(false) }}
              style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border-strong)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title, kind, lines, updateLine, removeLine, addLine, suggestions,
}: {
  title: string
  kind: 'earning' | 'deduction'
  lines: Line[]
  updateLine: (i: number, patch: Partial<Line>) => void
  removeLine: (i: number) => void
  addLine: () => void
  suggestions: string[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      {lines.map((l, i) => l.kind !== kind ? null : (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 28px', gap: 8, alignItems: 'center' }}>
          <input style={inputStyle} list={`sugg-${kind}`} value={l.name} onChange={(e) => updateLine(i, { name: e.target.value })} placeholder="Komponen" />
          <input style={inputStyle} type="number" min={0} value={l.amount} onChange={(e) => updateLine(i, { amount: parseInt(e.target.value || '0', 10) })} placeholder="IDR" />
          <button type="button" onClick={() => removeLine(i)}
            style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', font: '16px/1 sans-serif' }}>×</button>
        </div>
      ))}
      <datalist id={`sugg-${kind}`}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
      <button type="button" onClick={addLine}
        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: '4px 10px', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
        + Tambah {title.toLowerCase()}
      </button>
    </div>
  )
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ font: '600 13px/1.3 var(--font-mono, monospace)', color: accent ? 'var(--teal)' : 'var(--fg-1)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
