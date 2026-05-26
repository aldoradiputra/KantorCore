'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BankStatement, Journal, StatementRecord } from '@kantorcore/db'

interface MatchSuggestion {
  journalEntryId: string
  entryNumber: string
  description: string
  date: string
  amount: number
  confidence: number
  matchReason: string
}

interface Props {
  statements: BankStatement[]
  journals: Journal[]
  statusLabel: Record<string, string>
  statusColor: Record<string, string>
}

function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export function ReconWorkspace({ statements, journals, statusLabel, statusColor }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(
    statements[0]?.id ?? null
  )
  const [records, setRecords] = useState<StatementRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [matchingEntryId, setMatchingEntryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set())

  const selectedStatement = statements.find((s) => s.id === selectedStatementId) ?? null
  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null

  async function loadRecords(statementId: string) {
    setLoadingRecords(true)
    setSelectedRecordId(null)
    setSuggestions([])
    setError(null)
    try {
      const res = await fetch(`/api/fin/reconciliation/records?statement_id=${statementId}`)
      if (res.ok) {
        const data = await res.json() as { records: StatementRecord[] }
        setRecords(data.records ?? [])
        setReconciledIds(new Set(data.records.filter((r: StatementRecord) => r.cleared).map((r: StatementRecord) => r.id)))
      }
    } finally {
      setLoadingRecords(false)
    }
  }

  async function loadSuggestions(recordId: string) {
    setLoadingSuggestions(true)
    setSuggestions([])
    setError(null)
    try {
      const res = await fetch(`/api/fin/reconciliation/suggest?record_id=${recordId}`)
      if (res.ok) {
        const data = await res.json() as { suggestions: MatchSuggestion[] }
        setSuggestions(data.suggestions ?? [])
      }
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function handleSelectStatement(id: string) {
    setSelectedStatementId(id)
    loadRecords(id)
  }

  function handleSelectRecord(id: string) {
    setSelectedRecordId(id)
    loadSuggestions(id)
  }

  async function handleMatch(journalEntryId: string) {
    if (!selectedRecordId) return
    setMatchingEntryId(journalEntryId)
    setError(null)
    try {
      const res = await fetch('/api/fin/reconciliation/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: selectedRecordId, journal_entry_id: journalEntryId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setError(body.error ?? 'Gagal melakukan rekonsiliasi.')
      } else {
        setReconciledIds((prev) => new Set([...prev, selectedRecordId]))
        setSuggestions([])
        setSelectedRecordId(null)
        startTransition(() => router.refresh())
      }
    } finally {
      setMatchingEntryId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {/* Statement selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Pilih Laporan Rekening
        </label>
        {statements.length === 0 ? (
          <div style={{ padding: '16px', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>
            Belum ada laporan bank. Import laporan rekening terlebih dahulu.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {statements.map((stmt) => {
              const journal = journals.find((j) => j.id === stmt.journalId)
              const isActive = stmt.id === selectedStatementId
              const color = statusColor[stmt.status] ?? 'var(--fg-3)'
              return (
                <button
                  key={stmt.id}
                  onClick={() => handleSelectStatement(stmt.id)}
                  style={{
                    padding: '8px 14px',
                    border: `1px solid ${isActive ? 'var(--indigo)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-sm)',
                    background: isActive ? 'var(--indigo-light)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minWidth: 180,
                  }}
                >
                  <span style={{ font: '600 13px/1 var(--font-sans)', color: isActive ? 'var(--indigo)' : 'var(--fg-1)' }}>
                    {journal?.name ?? 'Jurnal'}
                  </span>
                  <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    {stmt.dateFrom} → {stmt.dateTo}
                  </span>
                  <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color }}>
                    {statusLabel[stmt.status] ?? stmt.status}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Split pane */}
      {selectedStatement && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', minHeight: 480 }}>
          {/* Left: unreconciled records */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Transaksi Bank
              </span>
            </div>
            {loadingRecords ? (
              <div style={{ padding: 24, font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>Memuat…</div>
            ) : records.length === 0 ? (
              <div style={{ padding: 24, font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>
                Pilih laporan untuk melihat transaksi.
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {records.map((rec) => {
                  const cleared = reconciledIds.has(rec.id)
                  const isSelected = rec.id === selectedRecordId
                  return (
                    <button
                      key={rec.id}
                      onClick={() => !cleared && handleSelectRecord(rec.id)}
                      disabled={cleared}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'var(--indigo-light)' : cleared ? 'var(--bg)' : 'transparent',
                        border: 'none',
                        borderBottomWidth: 1,
                        borderBottomStyle: 'solid',
                        borderBottomColor: 'var(--border)',
                        cursor: cleared ? 'default' : 'pointer',
                        textAlign: 'left',
                        opacity: cleared ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ font: '13px/1 var(--font-sans)', color: isSelected ? 'var(--indigo)' : 'var(--fg-1)' }}>
                          {rec.reference ?? '—'}
                        </span>
                        <span style={{ font: '600 13px/1 var(--font-sans)', color: Number(rec.amount) >= 0 ? 'var(--teal)' : 'var(--amber)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {formatIDR(Number(rec.amount))}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{rec.date}</span>
                        {cleared && (
                          <span style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '2px 6px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Rekonsiliasi
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: match suggestions */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedRecord ? `Cocokkan: ${selectedRecord.reference ?? selectedRecord.date}` : 'Saran Pasangan'}
              </span>
            </div>

            {!selectedRecord ? (
              <div style={{ padding: 24, font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>
                Pilih transaksi di sebelah kiri untuk melihat saran pasangan jurnal.
              </div>
            ) : loadingSuggestions ? (
              <div style={{ padding: 24, font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>Mencari pasangan…</div>
            ) : suggestions.length === 0 ? (
              <div style={{ padding: 24, font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>
                Tidak ada saran pasangan ditemukan untuk transaksi ini.
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {suggestions.map((s) => (
                  <div
                    key={s.journalEntryId}
                    style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {s.entryNumber}
                        </span>
                        <span style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-2)' }}>{s.description}</span>
                        <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{s.date}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {formatIDR(s.amount)}
                        </span>
                        <ConfidenceBadge confidence={s.confidence} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{s.matchReason}</span>
                      <button
                        onClick={() => handleMatch(s.journalEntryId)}
                        disabled={isPending || matchingEntryId === s.journalEntryId}
                        style={{
                          padding: '5px 12px',
                          background: 'var(--indigo)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--r-sm)',
                          font: '500 12px/1 var(--font-sans)',
                          cursor: (isPending || matchingEntryId === s.journalEntryId) ? 'not-allowed' : 'pointer',
                          opacity: (isPending || matchingEntryId === s.journalEntryId) ? 0.6 : 1,
                        }}
                      >
                        {matchingEntryId === s.journalEntryId ? 'Mencocokkan…' : 'Cocokkan'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#dc2626' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 80 ? 'var(--teal)' : confidence >= 50 ? 'var(--amber)' : 'var(--fg-3)'
  return (
    <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
      {confidence}% cocok
    </span>
  )
}
