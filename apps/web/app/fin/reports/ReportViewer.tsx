'use client'

import { useState } from 'react'

interface ReportNode {
  id: string
  code: string
  name: string
  level: number
  balance: number
  children?: ReportNode[]
  isGroup: boolean
}

interface ReportResult {
  title: string
  dateFrom: string
  dateTo: string
  currency: string
  nodes: ReportNode[]
  totalDebit?: number
  totalCredit?: number
}

const REPORT_TYPES = [
  { value: 'balance_sheet', label: 'Neraca (Balance Sheet)' },
  { value: 'profit_loss', label: 'Laba Rugi (Profit & Loss)' },
  { value: 'trial_balance', label: 'Neraca Saldo (Trial Balance)' },
] as const

type ReportType = (typeof REPORT_TYPES)[number]['value']

function today() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export function ReportViewer() {
  const [reportType, setReportType] = useState<ReportType>('balance_sheet')
  const [dateFrom, setDateFrom] = useState(firstOfYear())
  const [dateTo, setDateTo] = useState(today())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const params = new URLSearchParams({ report_type: reportType, date_from: dateFrom, date_to: dateTo })
      const res = await fetch(`/api/fin/reports/builder?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setError(body.error ?? 'Gagal memuat laporan.')
      } else {
        const data = await res.json() as ReportResult
        setResult(data)
      }
    } catch {
      setError('Koneksi gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      {/* Controls */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-4)' }}>
          <Field label="Jenis Laporan">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              style={inputStyle}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Dari Tanggal">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Sampai Tanggal">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '9px 20px',
              background: loading ? 'var(--fg-3)' : 'var(--indigo)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              font: '500 13px/1 var(--font-sans)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Membuat laporan…' : 'Buat Laporan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Report output */}
      {result && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', overflow: 'hidden' }}>
          {/* Report header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>{result.title}</div>
              <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
                Periode: {result.dateFrom} s/d {result.dateTo}
              </div>
            </div>
            <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{result.currency}</div>
          </div>

          {/* Nodes tree */}
          <div style={{ padding: '8px 0' }}>
            {result.nodes.map((node) => (
              <ReportTreeNode key={node.id} node={node} />
            ))}
          </div>

          {/* Trial balance totals */}
          {(result.totalDebit !== undefined || result.totalCredit !== undefined) && (
            <div style={{ padding: '12px 20px', borderTop: '2px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Total</span>
              <div style={{ display: 'flex', gap: 40 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Debit</div>
                  <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatIDR(result.totalDebit ?? 0)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Kredit</div>
                  <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatIDR(result.totalCredit ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportTreeNode({ node, depth = 0 }: { node: ReportNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  const indent = depth * 20

  return (
    <div>
      <div
        onClick={hasChildren ? () => setExpanded((v) => !v) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `${node.isGroup ? 10 : 8}px 20px`,
          paddingLeft: 20 + indent,
          borderBottom: node.isGroup ? '1px solid var(--border)' : undefined,
          background: node.isGroup && depth === 0 ? 'var(--bg)' : 'transparent',
          cursor: hasChildren ? 'pointer' : 'default',
          userSelect: 'none',
          gap: 8,
        }}
      >
        {/* Expand toggle */}
        <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
          {hasChildren ? (
            <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
              ▶
            </span>
          ) : null}
        </span>

        {/* Code */}
        <span style={{ width: 64, flexShrink: 0, font: '11px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
          {node.code}
        </span>

        {/* Name */}
        <span style={{ flex: 1, font: `${node.isGroup ? '600' : '400'} 13px/1.3 var(--font-sans)`, color: node.isGroup ? 'var(--fg-1)' : 'var(--fg-2)' }}>
          {node.name}
        </span>

        {/* Balance */}
        <span style={{ font: `${node.isGroup ? '600' : '400'} 13px/1 var(--font-mono, monospace)`, color: node.balance < 0 ? 'var(--amber)' : 'var(--fg-1)', flexShrink: 0 }}>
          {formatIDR(node.balance)}
        </span>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <ReportTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
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
