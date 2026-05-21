'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HdTicket, HdTicketMessage, HdTeam, TicketStatus, TicketPriority } from '../../../../lib/helpdesk'

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'Baru', open: 'Terbuka', pending: 'Menunggu', resolved: 'Selesai', closed: 'Ditutup',
}
const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak',
}
const PRIORITY_COLOR: Record<TicketPriority, string> = {
  low: 'var(--fg-3)', medium: 'var(--fg-2)', high: 'var(--amber)', urgent: 'var(--danger)',
}

export default function TicketDetail({
  ticket: initial,
  messages: initialMessages,
  teams,
  currentUserId,
  currentUserName,
}: {
  ticket: HdTicket
  messages: HdTicketMessage[]
  teams: HdTeam[]
  currentUserId: string
  currentUserName: string
}) {
  const router = useRouter()
  const [ticket, setTicket] = useState(initial)
  const [messages, setMessages] = useState(initialMessages)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/hd/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply.trim(), isInternal }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages((prev) => [...prev, msg])
        setReply('')
        // Refresh ticket status (may have changed to 'open')
        const tr = await fetch(`/api/hd/tickets/${ticket.id}`)
        if (tr.ok) setTicket(await tr.json())
      }
    } finally { setSending(false) }
  }

  async function updateStatus(status: TicketStatus) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/hd/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setTicket(await res.json())
    } finally { setUpdating(false) }
  }

  async function updatePriority(priority: TicketPriority) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/hd/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
      if (res.ok) setTicket(await res.json())
    } finally { setUpdating(false) }
  }

  const now = new Date()
  const overdue = ticket.slaDueAt && new Date(ticket.slaDueAt) < now && ticket.status !== 'resolved' && ticket.status !== 'closed'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
        {/* Ticket header */}
        <div style={{ padding: 'var(--s-4) var(--s-5)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', marginBottom: 4 }}>
            <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-3)' }}>{ticket.ticketNumber}</span>
            {overdue && <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--danger)', fontWeight: 600 }}>⏰ Melewati SLA</span>}
          </div>
          <h2 style={{ font: '600 18px/1.3 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            {ticket.subject}
          </h2>
          {ticket.reporterName && (
            <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              {ticket.reporterName}{ticket.reporterEmail && ` · ${ticket.reporterEmail}`}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-4) var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)', textAlign: 'center', padding: 'var(--s-6)' }}>
              Belum ada pesan.
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} style={{
              background: msg.isInternal ? 'var(--amber-light, #FFF9E6)' : 'var(--surface)',
              border: `1px solid ${msg.isInternal ? 'var(--amber, #B35A00)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              padding: 'var(--s-3) var(--s-4)',
              opacity: msg.isInternal ? 0.9 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ font: '600 12px/1 var(--font-sans)', color: msg.authorUserId ? 'var(--indigo)' : 'var(--fg-1)' }}>
                  {msg.authorName}
                  {msg.isInternal && <span style={{ marginLeft: 6, font: '10px/1 var(--font-sans)', color: 'var(--amber, #B35A00)', textTransform: 'uppercase' }}>Catatan Internal</span>}
                </span>
                <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                  {new Date(msg.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-1)', whiteSpace: 'pre-wrap' }}>
                {msg.body}
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <form onSubmit={sendReply} style={{ borderTop: '1px solid var(--border)', padding: 'var(--s-4) var(--s-5)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder={isInternal ? 'Tulis catatan internal…' : 'Tulis balasan…'}
            style={{
              width: '100%', padding: '8px 10px', border: `1px solid ${isInternal ? 'var(--amber, #B35A00)' : 'var(--border)'}`,
              borderRadius: 'var(--r-sm)', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)',
              background: isInternal ? 'var(--amber-light, #FFF9E6)' : 'var(--surface)', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}>
            <button type="submit" disabled={sending || !reply.trim()} style={{
              height: 32, padding: '0 var(--s-4)', background: isInternal ? 'var(--amber, #B35A00)' : 'var(--indigo)',
              color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
              font: '600 13px/1 var(--font-sans)', cursor: (sending || !reply.trim()) ? 'not-allowed' : 'pointer', opacity: (sending || !reply.trim()) ? 0.6 : 1,
            }}>
              {sending ? 'Mengirim…' : isInternal ? 'Simpan Catatan' : 'Kirim Balasan'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, font: '12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Catatan internal
            </label>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', overflowY: 'auto' }}>
        <SideSection label="Status">
          <select
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value as TicketStatus)}
            disabled={updating}
            style={sideInputStyle}
          >
            {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </SideSection>

        <SideSection label="Prioritas">
          <select
            value={ticket.priority}
            onChange={(e) => updatePriority(e.target.value as TicketPriority)}
            disabled={updating}
            style={{ ...sideInputStyle, color: PRIORITY_COLOR[ticket.priority] }}
          >
            {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </SideSection>

        <SideSection label="SLA">
          {ticket.slaDueAt ? (
            <span style={{ font: '12px/1.4 var(--font-sans)', color: overdue ? 'var(--danger)' : 'var(--fg-2)' }}>
              {new Date(ticket.slaDueAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {overdue && ' ⏰'}
            </span>
          ) : <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>—</span>}
        </SideSection>

        <SideSection label="Sumber">
          <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-2)', textTransform: 'capitalize' }}>{ticket.source}</span>
        </SideSection>

        <SideSection label="Dibuat">
          <span style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
            {new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </SideSection>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s-4)' }}>
          <button
            type="button"
            onClick={() => router.push('/hd/tickets')}
            style={{
              width: '100%', height: 32, background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer',
            }}
          >
            ← Semua Tiket
          </button>
        </div>
      </div>
    </div>
  )
}

function SideSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const sideInputStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 8px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--surface)',
}
