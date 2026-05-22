'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecordEventWithAuthor, ChatterActivityType } from '../../lib/chatter'

const ACTIVITY_LABELS: Record<ChatterActivityType, string> = {
  call:     'Telepon',
  meeting:  'Rapat',
  todo:     'Tugas',
  email:    'Email',
  deadline: 'Tenggat',
}

const ACTIVITY_ICONS: Record<ChatterActivityType, string> = {
  call: '📞', meeting: '🗓', todo: '✓', email: '✉', deadline: '⏰',
}

type Tab = 'note' | 'email' | 'activity'

export function Chatter({
  entityType,
  entityId,
  emailAccounts = [],
}: {
  entityType: string
  entityId: string
  emailAccounts?: { id: string; label: string; address: string }[]
}) {
  const [events, setEvents] = useState<RecordEventWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('note')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // note state
  const [noteBody, setNoteBody] = useState('')

  // email state
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailAccountId, setEmailAccountId] = useState(emailAccounts[0]?.id ?? '')

  // activity state
  const [actType, setActType] = useState<ChatterActivityType>('todo')
  const [actDue, setActDue] = useState('')
  const [actNote, setActNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/chatter/events?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
      )
      if (res.ok) setEvents(await res.json())
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => { load() }, [load])

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      let payload: Record<string, unknown>

      if (tab === 'note') {
        if (!noteBody.trim()) return
        payload = { entityType, entityId, eventType: 'log_note', body: noteBody }
      } else if (tab === 'email') {
        const toList = emailTo.split(',').map((s) => s.trim()).filter(Boolean)
        if (toList.length === 0 || !emailSubject.trim() || !emailBody.trim()) return
        payload = {
          entityType, entityId, eventType: 'send_email',
          to: toList,
          cc: emailCc.split(',').map((s) => s.trim()).filter(Boolean),
          subject: emailSubject,
          body: emailBody,
          ...(emailAccountId ? { accountId: emailAccountId } : {}),
        }
      } else {
        if (!actDue) return
        payload = {
          entityType, entityId, eventType: 'activity_scheduled',
          activityType: actType,
          activityDue: new Date(actDue).toISOString(),
          body: actNote || null,
        }
      }

      const res = await fetch('/api/chatter/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal menyimpan.')
      }
      const newEvent = await res.json()
      setEvents((prev) => [...prev, newEvent])
      setNoteBody(''); setEmailTo(''); setEmailCc(''); setEmailSubject(''); setEmailBody('')
      setActNote(''); setActDue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  async function markDone(eventId: string) {
    const res = await fetch(`/api/chatter/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const updated = await res.json()
      setEvents((prev) => prev.map((e) => e.id === eventId ? updated : e))
    }
  }

  const canSubmit =
    (tab === 'note' && noteBody.trim().length > 0) ||
    (tab === 'email' && emailTo.trim().length > 0 && emailSubject.trim().length > 0 && emailBody.trim().length > 0) ||
    (tab === 'activity' && actDue.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {/* Compose area */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
        background: 'var(--surface)', overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          {(['note', 'email', 'activity'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { note: 'Catat', email: 'Kirim Email', activity: 'Jadwalkan' }
            const active = tab === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: 'var(--s-2) var(--s-4)',
                  border: 'none', background: 'transparent',
                  borderBottom: active ? '2px solid var(--indigo)' : '2px solid transparent',
                  font: `${active ? '600' : '500'} 12px/1 var(--font-sans)`,
                  color: active ? 'var(--indigo)' : 'var(--fg-3)',
                  cursor: 'pointer', marginBottom: -1,
                }}
              >
                {labels[t]}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 'var(--s-3)' }}>
          {tab === 'note' && (
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Tulis catatan internal…"
              rows={3}
              style={textareaStyle}
            />
          )}

          {tab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              {emailAccounts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={labelStyle}>Dari</span>
                  <select
                    value={emailAccountId}
                    onChange={(e) => setEmailAccountId(e.target.value)}
                    style={inputStyle}
                  >
                    {emailAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.label} &lt;{a.address}&gt;</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={labelStyle}>Kepada</span>
                <input type="text" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@example.com, ..." style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={labelStyle}>CC</span>
                <input type="text" value={emailCc} onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="opsional" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={labelStyle}>Subjek</span>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Perihal…" style={inputStyle} />
              </div>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Isi email…"
                rows={4}
                style={textareaStyle}
              />
            </div>
          )}

          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(Object.keys(ACTIVITY_LABELS) as ChatterActivityType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActType(t)}
                    style={{
                      height: 28, padding: '0 var(--s-3)',
                      border: `1px solid ${actType === t ? 'var(--indigo)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-sm)', background: actType === t ? 'var(--indigo-light)' : 'transparent',
                      color: actType === t ? 'var(--indigo)' : 'var(--fg-2)',
                      font: '12px/1 var(--font-sans)', cursor: 'pointer',
                    }}
                  >
                    {ACTIVITY_ICONS[t]} {ACTIVITY_LABELS[t]}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={labelStyle}>Tenggat</span>
                <input type="datetime-local" value={actDue} onChange={(e) => setActDue(e.target.value)}
                  style={inputStyle} />
              </div>
              <textarea
                value={actNote}
                onChange={(e) => setActNote(e.target.value)}
                placeholder="Catatan opsional…"
                rows={2}
                style={textareaStyle}
              />
            </div>
          )}

          {error && (
            <div style={{ marginTop: 'var(--s-2)', color: 'var(--red)', font: '12px/1.4 var(--font-sans)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--s-2)' }}>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canSubmit}
              style={{
                height: 28, padding: '0 var(--s-4)',
                background: canSubmit ? 'var(--indigo)' : 'var(--border)',
                color: canSubmit ? 'white' : 'var(--fg-3)',
                border: 'none', borderRadius: 'var(--r-sm)',
                font: '600 12px/1 var(--font-sans)', cursor: canSubmit ? 'pointer' : 'default',
              }}
            >
              {submitting ? 'Menyimpan…'
                : tab === 'note' ? 'Tambah Catatan'
                : tab === 'email' ? 'Kirim'
                : 'Jadwalkan'}
            </button>
          </div>
        </div>
      </div>

      {/* Event feed */}
      {loading && (
        <div style={{ color: 'var(--fg-3)', font: '12px/1.5 var(--font-sans)' }}>Memuat…</div>
      )}
      {!loading && events.length === 0 && (
        <div style={{ color: 'var(--fg-3)', font: '12px/1.5 var(--font-sans)', fontStyle: 'italic' }}>
          Belum ada aktivitas.
        </div>
      )}
      {[...events].reverse().map((e) => (
        <EventItem key={e.id} event={e} onMarkDone={markDone} />
      ))}
    </div>
  )
}

function EventItem({
  event,
  onMarkDone,
}: {
  event: RecordEventWithAuthor
  onMarkDone: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isActivity = event.eventType === 'activity_scheduled' || event.eventType === 'activity_done'
  const isDone = event.eventType === 'activity_done'
  const isEmail = event.eventType === 'send_email'
  const isNote = event.eventType === 'log_note'

  const dot = isNote ? 'var(--fg-3)'
    : isEmail ? 'var(--teal)'
    : isDone ? 'var(--fg-3)'
    : 'var(--amber)'

  return (
    <div style={{
      display: 'flex', gap: 'var(--s-3)',
      opacity: isDone ? 0.6 : 1,
    }}>
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0,
        }} />
      </div>

      <div style={{ flex: 1, paddingBottom: 'var(--s-3)', borderBottom: '1px solid var(--border)' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ font: '600 12px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
            {event.authorName || event.authorEmail || 'Sistem'}
            <span style={{ font: '400 12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginLeft: 6 }}>
              {eventLabel(event)}
            </span>
            {isActivity && event.activityType && (
              <span style={{
                marginLeft: 6, font: '600 11px/1 var(--font-sans)',
                color: isDone ? 'var(--fg-3)' : 'var(--amber)',
              }}>
                {ACTIVITY_ICONS[event.activityType as ChatterActivityType]} {ACTIVITY_LABELS[event.activityType as ChatterActivityType]}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {event.activityDue && !isDone && (
              <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--amber)' }}>
                {formatDate(new Date(event.activityDue))}
              </span>
            )}
            <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)' }}>
              {formatDate(new Date(event.createdAt))}
            </span>
            {event.eventType === 'activity_scheduled' && (
              <button
                type="button"
                onClick={() => onMarkDone(event.id)}
                style={{
                  height: 22, padding: '0 8px', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', background: 'transparent',
                  font: '600 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer',
                }}
              >
                Selesai
              </button>
            )}
          </div>
        </div>

        {/* Email subject */}
        {isEmail && event.subject && (
          <div style={{
            font: '600 12px/1.3 var(--font-sans)', color: 'var(--fg-2)',
            marginTop: 4,
          }}>
            {event.subject}
            {event.toAddrs.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--fg-3)', marginLeft: 6 }}>
                → {event.toAddrs.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Body */}
        {event.body && (
          <div>
            <div style={{
              marginTop: 4, font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)',
              whiteSpace: 'pre-wrap',
              ...(expanded ? {} : {
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }),
            }}>
              {event.body}
            </div>
            {event.body.length > 200 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                style={{
                  marginTop: 2, border: 'none', background: 'transparent',
                  font: '11px/1 var(--font-sans)', color: 'var(--indigo)', cursor: 'pointer', padding: 0,
                }}
              >
                {expanded ? 'Tampilkan lebih sedikit' : 'Tampilkan semua'}
              </button>
            )}
          </div>
        )}

        {/* Internal badge */}
        {event.isInternal && event.eventType !== 'activity_scheduled' && event.eventType !== 'activity_done' && (
          <div style={{ marginTop: 4 }}>
            <span style={{
              font: '10px/1 var(--font-sans)', fontWeight: 600,
              color: 'var(--fg-3)', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 3, padding: '1px 5px',
            }}>
              INTERNAL
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function eventLabel(e: RecordEventWithAuthor): string {
  switch (e.eventType) {
    case 'log_note':           return 'menambahkan catatan'
    case 'send_email':         return 'mengirim email'
    case 'activity_scheduled': return 'menjadwalkan aktivitas'
    case 'activity_done':      return 'menyelesaikan aktivitas'
    default:                   return e.eventType
  }
}

function formatDate(d: Date): string {
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'baru saja'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt lalu`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: 'var(--s-2) var(--s-3)',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg)', resize: 'vertical',
}

const inputStyle: React.CSSProperties = {
  flex: 1, height: 28, padding: '0 var(--s-3)',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--bg)',
}

const labelStyle: React.CSSProperties = {
  font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)',
  flexShrink: 0, width: 48, textAlign: 'right',
}
