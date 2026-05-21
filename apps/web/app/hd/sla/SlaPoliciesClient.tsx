'use client'

import { useState } from 'react'
import type { HdSlaPolicy } from '../../../lib/helpdesk'

const PRIORITY_LABELS = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak' }
const SOURCE_LABELS = { portal: 'Portal', email: 'Email', chat: 'Chat', phone: 'Telepon', manual: 'Manual' }

function minutesToLabel(min: number): string {
  if (min < 60) return `${min} menit`
  if (min < 24 * 60) return `${min / 60} jam`
  return `${min / 60 / 24} hari`
}

function PolicyForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<HdSlaPolicy>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const cond = (initial?.conditions ?? {}) as Record<string, unknown>
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [condPriority, setCondPriority] = useState(cond.priority as string ?? '')
  const [condSource, setCondSource] = useState(cond.source as string ?? '')
  const [responseMin, setResponseMin] = useState(initial?.responseTargetMinutes ?? 480)
  const [resolutionMin, setResolutionMin] = useState(initial?.resolutionTargetMinutes ?? 2880)
  const [priorityOrder, setPriorityOrder] = useState(initial?.priorityOrder ?? 0)
  const [saving, setSaving] = useState(false)

  async function handle() {
    setSaving(true)
    const conditions: Record<string, unknown> = {}
    if (condPriority) conditions.priority = condPriority
    if (condSource) conditions.source = condSource
    await onSave({ name, description: description || null, conditions, responseTargetMinutes: responseMin, resolutionTargetMinutes: resolutionMin, priorityOrder })
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--s-4)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Nama kebijakan</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Mis: SLA Tiket Urgent" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Urutan evaluasi (kecil = prioritas)</label>
          <input type="number" min={0} value={priorityOrder} onChange={(e) => setPriorityOrder(Number(e.target.value))} style={inp} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={lbl}>Deskripsi (opsional)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={inp} placeholder="Keterangan kebijakan" />
      </div>
      <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
        KONDISI (semua kosong = berlaku untuk semua tiket)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Prioritas (opsional)</label>
          <select value={condPriority} onChange={(e) => setCondPriority(e.target.value)} style={inp}>
            <option value="">Semua</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Sumber (opsional)</label>
          <select value={condSource} onChange={(e) => setCondSource(e.target.value)} style={inp}>
            <option value="">Semua</option>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
        TARGET WAKTU (dalam menit)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Respons pertama (menit)</label>
          <input type="number" min={1} value={responseMin} onChange={(e) => setResponseMin(Number(e.target.value))} style={inp} />
          <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{minutesToLabel(responseMin)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Penyelesaian (menit)</label>
          <input type="number" min={1} value={resolutionMin} onChange={(e) => setResolutionMin(Number(e.target.value))} style={inp} />
          <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{minutesToLabel(resolutionMin)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={handle} disabled={saving || !name.trim()} style={{ ...btnPrimary, opacity: saving || !name.trim() ? 0.6 : 1, cursor: saving || !name.trim() ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button type="button" onClick={onCancel} style={btnSecondary}>Batal</button>
      </div>
    </div>
  )
}

export default function SlaPoliciesClient({ initialPolicies }: { initialPolicies: HdSlaPolicy[] }) {
  const [policies, setPolicies] = useState(initialPolicies)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(data: Record<string, unknown>) {
    const res = await fetch('/api/hd/sla-policies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
    const p = await res.json()
    setPolicies((prev) => [...prev, p])
    setCreating(false)
  }

  async function handleUpdate(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/hd/sla-policies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Gagal'); return }
    const p = await res.json()
    setPolicies((prev) => prev.map((x) => x.id === id ? p : x))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus kebijakan SLA ini?')) return
    await fetch(`/api/hd/sla-policies/${id}`, { method: 'DELETE' })
    setPolicies((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      {error && <div style={{ padding: 'var(--s-3)', background: 'var(--red-light)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>}

      {policies.length === 0 && !creating && (
        <div style={{ padding: 'var(--s-6)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Belum ada kebijakan SLA. Buat satu untuk menggantikan default berbasis prioritas.
        </div>
      )}

      {policies.map((p) => (
        <div key={p.id}>
          {editingId === p.id ? (
            <PolicyForm initial={p} onSave={(d) => handleUpdate(p.id, d)} onCancel={() => setEditingId(null)} />
          ) : (
            <div style={{ padding: 'var(--s-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{p.name}</span>
                  {!p.active && <span style={{ padding: '2px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Nonaktif</span>}
                  <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)' }}>#{p.priorityOrder}</span>
                </div>
                {p.description && <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 8 }}>{p.description}</div>}
                <div style={{ display: 'flex', gap: 16, font: '12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                  <span>Respons: <strong>{minutesToLabel(p.responseTargetMinutes)}</strong></span>
                  <span>Selesai: <strong>{minutesToLabel(p.resolutionTargetMinutes)}</strong></span>
                  {(() => {
                    const c = p.conditions as Record<string, unknown>
                    const parts = []
                    if (c.priority) parts.push(`Prioritas: ${(PRIORITY_LABELS as Record<string, string>)[c.priority as string] ?? c.priority}`)
                    if (c.source) parts.push(`Sumber: ${(SOURCE_LABELS as Record<string, string>)[c.source as string] ?? c.source}`)
                    if (c.teamId) parts.push('Team tertentu')
                    return parts.length ? <span>Kondisi: {parts.join(', ')}</span> : <span style={{ color: 'var(--fg-3)' }}>Berlaku untuk semua tiket</span>
                  })()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={() => setEditingId(p.id)} style={btnSecondary}>Edit</button>
                <button type="button" onClick={() => handleDelete(p.id)} style={{ ...btnSecondary, color: 'var(--danger)' }}>Hapus</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {creating ? (
        <PolicyForm onSave={handleCreate} onCancel={() => setCreating(false)} />
      ) : (
        <button type="button" onClick={() => setCreating(true)} style={{ height: 36, border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)', cursor: 'pointer' }}>
          + Tambah kebijakan SLA
        </button>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }
const inp: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', width: '100%' }
const btnPrimary: React.CSSProperties = { height: 32, padding: '0 16px', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { height: 32, padding: '0 12px', background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer' }
