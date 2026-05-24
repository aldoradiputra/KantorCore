'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

type PresenceStatus = 'online' | 'away' | 'offline'

interface PresenceRow {
  userId: string
  name: string
  email: string
  status: PresenceStatus
  lastSeenAt: string
}

type LeaveRow = {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  halfDay: boolean
  status: string
  notes: string | null
}

interface LeaveAround {
  yesterday: LeaveRow[]
  today: LeaveRow[]
  tomorrow: LeaveRow[]
}

const LEAVE_LABELS: Record<string, string> = {
  annual_leave: 'Cuti Tahunan',
  sick_leave:   'Sakit',
  maternity:    'Melahirkan',
  paternity:    'Kelahiran Anak',
  unpaid:       'Tanpa Bayar',
  other:        'Lainnya',
}

const STATUS_DOT: Record<PresenceStatus, string> = {
  online:  'var(--teal)',
  away:    'var(--amber)',
  offline: 'var(--fg-3)',
}

const STATUS_LABEL: Record<PresenceStatus, string> = {
  online:  'Online',
  away:    'AFK',
  offline: 'Offline',
}

function StatusDot({ status, size = 7 }: { status: PresenceStatus; size?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      borderRadius: '50%',
      background: STATUS_DOT[status],
      flexShrink: 0,
    }} />
  )
}

function leaveTypeLabel(t: string) {
  return LEAVE_LABELS[t] ?? t
}

function PresenceGroup({ label, rows }: { label: string; rows: PresenceRow[] }) {
  if (rows.length === 0) return null
  return (
    <div>
      <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px' }}>
        {label} ({rows.length})
      </div>
      {rows.map(r => (
        <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' }}>
          <StatusDot status={r.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '500 12px/1.3 var(--font-sans)', color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LeaveSection({ label, rows, color }: { label: string; rows: LeaveRow[]; color: string }) {
  if (rows.length === 0) return null
  return (
    <div>
      <div style={{ font: '600 10px/1 var(--font-sans)', color, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px' }}>
        {label} ({rows.length})
      </div>
      {rows.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.leaveType === 'sick_leave' ? '#c0392b' : color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '500 12px/1.3 var(--font-sans)', color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.employeeName}
            </div>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 1 }}>
              {leaveTypeLabel(r.leaveType)}{r.halfDay ? ' · ½ hari' : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
}

export default function PresenceBadge() {
  const [networkOnline, setNetworkOnline] = useState(true)
  const [open, setOpen]                   = useState(false)
  const [presence, setPresence]           = useState<PresenceRow[]>([])
  const [leave, setLeave]                 = useState<LeaveAround>({ yesterday: [], today: [], tomorrow: [] })
  const [loading, setLoading]             = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Network connectivity
  useEffect(() => {
    setNetworkOnline(navigator.onLine)
    const on = () => setNetworkOnline(true)
    const off = () => setNetworkOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Heartbeat — keep presence alive every 25 seconds
  const sendHeartbeat = useCallback(async () => {
    if (!networkOnline) return
    const idle = document.hidden || (Date.now() - lastActivity.current > 5 * 60 * 1000)
    await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: idle ? 'away' : 'online' }),
    }).catch(() => {})
  }, [networkOnline])

  const lastActivity = useRef(Date.now())
  useEffect(() => {
    const track = () => { lastActivity.current = Date.now() }
    window.addEventListener('mousemove', track, { passive: true })
    window.addEventListener('keydown', track, { passive: true })
    return () => { window.removeEventListener('mousemove', track); window.removeEventListener('keydown', track) }
  }, [])

  useEffect(() => {
    sendHeartbeat()
    heartbeatRef.current = setInterval(sendHeartbeat, 25_000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [sendHeartbeat])

  // Load popover data
  async function loadData() {
    setLoading(true)
    const [presenceRes, leaveRes] = await Promise.all([
      fetch('/api/presence').catch(() => null),
      fetch('/api/hr/time-off?mode=around').catch(() => null),
    ])
    if (presenceRes?.ok) {
      const d = await presenceRes.json()
      setPresence(d.presence ?? [])
    }
    if (leaveRes?.ok) {
      const d = await leaveRes.json()
      setLeave(d)
    }
    setLoading(false)
  }

  function openPanel() {
    setOpen(true)
    loadData()
  }

  // Click-outside close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const online  = presence.filter(p => p.status === 'online')
  const away    = presence.filter(p => p.status === 'away')

  const hasPresence = online.length + away.length > 0
  const hasLeave = leave.yesterday.length + leave.today.length + leave.tomorrow.length > 0

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Badge trigger */}
      <div
        ref={triggerRef}
        onClick={open ? () => setOpen(false) : openPanel}
        title="Status tim"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 8px',
          borderRadius: 'var(--r-sm)',
          background: networkOnline ? 'rgba(15,123,108,0.06)' : 'rgba(179,90,0,0.06)',
          border: `1px solid ${networkOnline ? 'rgba(15,123,108,0.2)' : 'rgba(179,90,0,0.2)'}`,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: networkOnline ? 'var(--teal)' : 'var(--amber)',
          flexShrink: 0,
        }} />
        <span style={{
          font: '600 10px/1 var(--font-sans)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: networkOnline ? 'var(--teal)' : 'var(--amber)',
        }}>
          {networkOnline ? (online.length > 0 ? `${online.length} online` : 'Live') : 'Offline'}
        </span>
      </div>

      {/* Popover */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 280,
            maxHeight: 480,
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            zIndex: 200,
            paddingBottom: 4,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px 8px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Status Tim</span>
            <Link
              href="/hr/time-off"
              onClick={() => setOpen(false)}
              style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
            >
              Lihat →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '20px 12px', font: '12px var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>
              Memuat…
            </div>
          ) : (
            <>
              {/* Presence section */}
              {hasPresence ? (
                <>
                  <PresenceGroup label="Online" rows={online} />
                  <PresenceGroup label="AFK" rows={away} />
                </>
              ) : (
                <div style={{ padding: '10px 12px', font: '12px var(--font-sans)', color: 'var(--fg-3)' }}>
                  Tidak ada yang sedang online.
                </div>
              )}

              {/* Leave section */}
              {hasLeave && (
                <>
                  <Divider />
                  <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 2px' }}>
                    Cuti & Izin
                  </div>
                  <LeaveSection label="Kemarin" rows={leave.yesterday} color="var(--fg-3)" />
                  <LeaveSection label="Hari Ini"  rows={leave.today}    color="var(--amber)" />
                  <LeaveSection label="Besok"     rows={leave.tomorrow} color="var(--indigo)" />
                </>
              )}

              {!hasPresence && !hasLeave && (
                <div style={{ padding: '12px 12px', font: '12px var(--font-sans)', color: 'var(--fg-3)' }}>
                  Tidak ada data.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
