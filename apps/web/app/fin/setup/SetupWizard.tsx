'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'journals' | 'banks' | 'done'

const STEPS: { id: Step; label: string; desc: string }[] = [
  { id: 'journals', label: 'Jurnal Default', desc: 'Buat jurnal sistem (Penjualan, Pembelian, Kas, Bank, Umum)' },
  { id: 'banks', label: 'Bank Master', desc: 'Muat daftar bank Indonesia (BCA, Mandiri, BRI, BNI, dll.)' },
  { id: 'done', label: 'Selesai', desc: 'Akuntansi siap digunakan' },
]

export function SetupWizard() {
  const router = useRouter()
  const [current, setCurrent] = useState<Step>('journals')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Set<Step>>(new Set())

  async function runStep(step: Step) {
    setLoading(true)
    setError(null)
    try {
      if (step === 'journals') {
        const res = await fetch('/api/fin/journals-setup/seed', { method: 'POST' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? 'Gagal membuat jurnal default.')
        }
        setCompleted((s) => new Set(s).add('journals'))
        setCurrent('banks')
      } else if (step === 'banks') {
        const res = await fetch('/api/fin/journals-setup/seed-banks', { method: 'POST' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? 'Gagal memuat bank master.')
        }
        setCompleted((s) => new Set(s).add('banks'))
        setCurrent('done')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {STEPS.map((step, i) => {
        const done = completed.has(step.id)
        const active = current === step.id
        return (
          <div
            key={step.id}
            style={{
              border: `1px solid ${active ? 'var(--indigo)' : done ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              padding: 'var(--s-4) var(--s-5)',
              background: done ? 'color-mix(in srgb, var(--teal) 6%, var(--surface))' : 'var(--surface)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--s-4)',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
              background: done ? 'var(--teal)' : active ? 'var(--indigo)' : 'var(--border)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              font: '600 12px/1 var(--font-sans)',
            }}>
              {done ? '✓' : i + 1}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 4 }}>{step.label}</div>
              <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>{step.desc}</div>

              {active && step.id !== 'done' && (
                <div style={{ marginTop: 'var(--s-4)' }}>
                  {error && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--r-sm)', font: '12px/1.4 var(--font-sans)', color: '#dc2626', marginBottom: 'var(--s-3)' }}>
                      {error}
                    </div>
                  )}
                  <button
                    onClick={() => runStep(step.id)}
                    disabled={loading}
                    style={{
                      padding: '8px 18px',
                      background: loading ? 'var(--fg-3)' : 'var(--indigo)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--r-sm)',
                      font: '500 13px/1 var(--font-sans)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Memproses…' : step.id === 'journals' ? 'Buat Jurnal Default' : 'Muat Bank Master'}
                  </button>
                </div>
              )}

              {active && step.id === 'done' && (
                <div style={{ marginTop: 'var(--s-4)' }}>
                  <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--teal)', margin: '0 0 var(--s-3)' }}>
                    Semua langkah selesai. Modul akuntansi siap digunakan.
                  </p>
                  <button
                    onClick={() => router.push('/fin/journals-setup')}
                    style={{
                      padding: '8px 18px',
                      background: 'var(--teal)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--r-sm)',
                      font: '500 13px/1 var(--font-sans)',
                      cursor: 'pointer',
                    }}
                  >
                    Lihat Jurnal →
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
