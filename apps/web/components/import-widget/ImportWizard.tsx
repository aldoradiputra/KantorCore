'use client'
import { useState, useRef } from 'react'
import { ConfigDrawer } from './ConfigDrawer'
import { MappingCanvas } from './MappingCanvas'
import { PreviewGrid } from './PreviewGrid'
import type {
  WizardStep, ImportWizardProps, FieldMapping, ImportConfig,
  DryRunResult, RowError, AnalyzeResult, DuplicateStrategy, ErrorStrategy,
} from './types'

const STEP_LABELS: { step: WizardStep; label: string }[] = [
  { step: 'config',    label: '1. Unggah & Konfigurasi' },
  { step: 'mapping',   label: '2. Peta Field' },
  { step: 'dry_run',   label: '3. Uji Coba' },
  { step: 'streaming', label: '4. Proses' },
  { step: 'done',      label: '5. Selesai' },
]

export function ImportWizard({ targetSchema, onComplete, title = 'Import Data' }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [config, setConfig] = useState<ImportConfig>({})
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null)
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip')
  const [errorStrategy, setErrorStrategy] = useState<ErrorStrategy>('skip_row')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ processed: number; errors: number } | null>(null)
  const [finalRows, setFinalRows] = useState<Record<string, unknown>[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const allRequiredMapped = targetSchema.fields
    .filter((f) => f.required)
    .every((f) => mappings.some((m) => m.targetField === f.name))

  // ── Step: file selected → analyze ──────────────────────────────────────────
  async function onFileSelect(f: File) {
    if (f.size > 500 * 1024 * 1024) { setError('File melebihi batas 500 MB.'); return }
    setFile(f)
    setStep('config')
    setError(null)
  }

  async function runAnalyze() {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('targetSchema', JSON.stringify(targetSchema))
      fd.append('config', JSON.stringify(config))
      const res = await fetch('/api/import/analyze', { method: 'POST', body: fd })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Analisis gagal'); }
      const data: AnalyzeResult = await res.json()
      setAnalyzeResult(data)
      setMappings(data.mappings)
      setStep('mapping')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menganalisis file.')
    } finally {
      setBusy(false)
    }
  }

  // ── Step: mapping → dry run ─────────────────────────────────────────────────
  async function runDryRun() {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('targetSchema', JSON.stringify(targetSchema))
      fd.append('mappings', JSON.stringify(mappings))
      fd.append('config', JSON.stringify(config))
      const res = await fetch('/api/import/dry-run', { method: 'POST', body: fd })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Dry run gagal'); }
      const data: DryRunResult = await res.json()
      setDryRun(data)
      setStep('dry_run')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal uji coba.')
    } finally {
      setBusy(false)
    }
  }

  // ── Step: execute streaming import ─────────────────────────────────────────
  async function runImport() {
    if (!file) return
    setBusy(true); setError(null); setProgress({ processed: 0, errors: 0 })
    setStep('streaming')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('targetSchema', JSON.stringify(targetSchema))
      fd.append('mappings', JSON.stringify(mappings))
      fd.append('config', JSON.stringify(config))
      fd.append('errorStrategy', errorStrategy)
      const res = await fetch('/api/import/stream', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Stream gagal dimulai')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let rows: Record<string, unknown>[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.done) {
              rows = event.validRows ?? []
              setFinalRows(rows)
              setStep('done')
              onComplete(rows)
            } else {
              setProgress({ processed: event.processed ?? 0, errors: event.errors ?? 0 })
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import gagal.')
      setStep('dry_run')
    } finally {
      setBusy(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const activeStepIndex = STEP_LABELS.findIndex((s) => s.step === step)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{title}</div>
        {step !== 'idle' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {STEP_LABELS.map((s, i) => (
              <span key={s.step} style={{
                padding: '3px 10px', borderRadius: 999,
                font: '500 11px/1 var(--font-sans)',
                background: i === activeStepIndex ? 'var(--indigo)' : i < activeStepIndex ? 'var(--indigo-light)' : 'var(--surface)',
                color: i === activeStepIndex ? 'white' : i < activeStepIndex ? 'var(--indigo)' : 'var(--fg-3)',
                border: `1px solid ${i <= activeStepIndex ? 'var(--indigo)' : 'var(--border)'}`,
              }}>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: '#fee', color: '#c33', font: '13px/1.4 var(--font-sans)' }}>
          {error}
        </div>
      )}

      {/* IDLE: drop zone */}
      {step === 'idle' && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFileSelect(f) }}
          style={{
            border: '2px dashed var(--border)', borderRadius: 'var(--r-lg)',
            padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
            background: 'var(--surface)',
          }}
        >
          <div style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-2)', marginBottom: 8 }}>
            Seret file ke sini atau klik untuk memilih
          </div>
          <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
            CSV, XLS, XLSX, XML, JSON, PDF · Maks 500 MB
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx,.xml,.json,.pdf" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f) }} />
        </div>
      )}

      {/* CONFIG: show file info + config drawer */}
      {step === 'config' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{file.name}</div>
            <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <ConfigDrawer filename={file.name} sheets={analyzeResult?.sheets} config={config} onChange={setConfig} />
          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <Btn onClick={runAnalyze} busy={busy} primary>Analisis & Lanjutkan →</Btn>
            <Btn onClick={() => { setStep('idle'); setFile(null) }}>Ganti File</Btn>
          </div>
        </div>
      )}

      {/* MAPPING */}
      {step === 'mapping' && analyzeResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <MappingCanvas mappings={mappings} targetFields={targetSchema.fields} onChange={setMappings} />
          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <Btn onClick={() => setStep('config')}>← Kembali</Btn>
            <Btn onClick={runDryRun} busy={busy} primary disabled={!allRequiredMapped}>
              Uji Coba (50 baris) →
            </Btn>
          </div>
        </div>
      )}

      {/* DRY RUN */}
      {step === 'dry_run' && dryRun && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <StatChip label="Valid" value={dryRun.validCount} color="var(--teal)" />
            <StatChip label="Error" value={dryRun.invalidCount} color={dryRun.invalidCount > 0 ? '#c0392b' : 'var(--fg-3)'} />
          </div>

          <PreviewGrid headers={dryRun.headers} rows={dryRun.preview} errors={dryRun.errors} />

          {/* Strategy selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            <StrategySelect label="Strategi Duplikat" value={duplicateStrategy} onChange={(v) => setDuplicateStrategy(v as DuplicateStrategy)}
              options={[
                { value: 'skip',      label: 'Skip — pertahankan data lama' },
                { value: 'overwrite', label: 'Overwrite — timpa semua field' },
                { value: 'merge',     label: 'Merge — isi field kosong saja' },
              ]} />
            <StrategySelect label="Strategi Error" value={errorStrategy} onChange={(v) => setErrorStrategy(v as ErrorStrategy)}
              options={[
                { value: 'skip_row',      label: 'Skip Row — lewati baris invalid' },
                { value: 'partial_split', label: 'Partial — proses valid + log error' },
                { value: 'abort',         label: 'Abort — batalkan jika ada error' },
              ]} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <Btn onClick={() => setStep('mapping')}>← Ubah Pemetaan</Btn>
            <Btn onClick={runImport} busy={busy} primary>Mulai Import →</Btn>
          </div>
        </div>
      )}

      {/* STREAMING */}
      {step === 'streaming' && progress && (
        <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', alignItems: 'center' }}>
          <div style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Memproses…</div>
          <div style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)' }}>
            {progress.processed} baris diproses · {progress.errors} error
          </div>
          <div style={{ width: '100%', maxWidth: 400, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--indigo)', width: '60%', animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', alignItems: 'center' }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--teal)' }}>Import Berhasil</div>
          <div style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)' }}>
            {finalRows.length} baris berhasil diimpor.
          </div>
          <Btn onClick={() => { setStep('idle'); setFile(null); setAnalyzeResult(null); setMappings([]); setDryRun(null); setProgress(null) }}>
            Import File Lain
          </Btn>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Btn({ onClick, children, busy, primary, disabled }: {
  onClick: () => void; children: React.ReactNode; busy?: boolean; primary?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={busy || disabled} style={{
      padding: '9px 16px', borderRadius: 'var(--r-md)',
      background: primary ? 'var(--indigo)' : 'transparent',
      color: primary ? 'white' : 'var(--fg-2)',
      border: primary ? 'none' : '1px solid var(--border-strong)',
      font: '600 13px/1 var(--font-sans)', cursor: (busy || disabled) ? 'not-allowed' : 'pointer',
      opacity: (busy || disabled) ? 0.6 : 1,
    }}>
      {busy ? 'Memproses…' : children}
    </button>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', border: `1px solid ${color}`, background: 'var(--surface)' }}>
      <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ font: '700 22px/1.2 var(--font-mono, monospace)', color, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function StrategySelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        height: 34, padding: '0 10px', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)',
        color: 'var(--fg-1)', background: 'var(--bg-1)',
      }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
