'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccountSafe, ThreadListItem } from '../../lib/email'
import type { EmailMessage, EmailThread } from '@kantorcore/db'

type ThreadDetail = { thread: EmailThread; messages: EmailMessage[] }

export default function EmailClient({
  initialAccounts,
  isAdmin,
}: {
  initialAccounts: AccountSafe[]
  isAdmin: boolean
}) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [activeAccountId, setActiveAccountId] = useState<string | null>(initialAccounts[0]?.id ?? null)
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ThreadDetail | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(accounts.length === 0)
  const [error, setError] = useState<string | null>(null)

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  )

  const loadThreads = useCallback(async (accountId: string) => {
    setLoadingThreads(true)
    try {
      const res = await fetch(`/api/email/threads?accountId=${accountId}&status=open`)
      if (!res.ok) throw new Error('Gagal memuat thread.')
      setThreads(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoadingThreads(false)
    }
  }, [])

  useEffect(() => {
    if (activeAccountId) loadThreads(activeAccountId)
  }, [activeAccountId, loadThreads])

  const openThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/email/threads/${threadId}`)
      if (!res.ok) throw new Error('Gagal memuat pesan.')
      setDetail(await res.json())
      // Optimistically mark unread = 0
      setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, unreadCount: 0 } : t))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!activeAccountId) return
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch(`/api/email/accounts/${activeAccountId}/sync`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Sinkronisasi gagal.')
      }
      await loadThreads(activeAccountId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSyncing(false)
    }
  }, [activeAccountId, loadThreads])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Account sidebar */}
      <aside style={{
        width: 220, borderRight: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: 'var(--s-4)', borderBottom: '1px solid var(--border)' }}>
          <div className="t-micro" style={{ color: 'var(--fg-3)' }}>Email</div>
          <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginTop: 2 }}>
            Kotak Bersama
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-2)' }}>
          {accounts.length === 0 && (
            <div style={{ padding: 'var(--s-3)', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
              Belum ada akun email.
            </div>
          )}
          {accounts.map((a) => {
            const active = a.id === activeAccountId
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => { setActiveAccountId(a.id); setDetail(null); setActiveThreadId(null) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: 'var(--s-2) var(--s-3)', borderRadius: 'var(--r-sm)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  border: 'none', cursor: 'pointer', marginBottom: 2,
                  color: active ? 'var(--indigo)' : 'var(--fg-1)',
                  font: `${active ? '600' : '500'} 13px/1.3 var(--font-sans)`,
                }}
              >
                <div>{a.label}</div>
                <div style={{ font: '11px/1.2 var(--font-mono)', color: 'var(--fg-3)', marginTop: 2 }}>
                  {a.address}
                </div>
              </button>
            )
          })}
        </nav>
        {isAdmin && (
          <div style={{ padding: 'var(--s-3)', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowAddAccount(true)}
              style={{
                width: '100%', height: 30, border: '1px solid var(--border)',
                background: 'var(--surface)', borderRadius: 'var(--r-sm)',
                font: '600 12px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer',
              }}
            >
              + Tambah Akun
            </button>
          </div>
        )}
      </aside>

      {/* Thread list */}
      <section style={{
        width: 360, borderRight: '1px solid var(--border)', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <header style={{
          padding: 'var(--s-3) var(--s-4)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface)',
        }}>
          <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>
            {activeAccount?.label ?? '—'}
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={!activeAccountId || syncing}
            style={{
              height: 26, padding: '0 10px', border: '1px solid var(--border)',
              background: 'var(--surface)', borderRadius: 'var(--r-sm)',
              font: '600 11px/1 var(--font-sans)',
              color: syncing ? 'var(--fg-3)' : 'var(--fg-2)',
              cursor: syncing ? 'wait' : 'pointer',
            }}
          >
            {syncing ? 'Sinkron…' : 'Sinkronkan'}
          </button>
        </header>
        {error && (
          <div style={{
            padding: 'var(--s-2) var(--s-4)', background: 'var(--red-light)',
            color: 'var(--red)', font: '12px/1.4 var(--font-sans)',
          }}>{error}</div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingThreads && (
            <div style={{ padding: 'var(--s-4)', color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)' }}>Memuat…</div>
          )}
          {!loadingThreads && threads.length === 0 && (
            <div style={{ padding: 'var(--s-5)', color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)', textAlign: 'center' }}>
              Belum ada pesan. Klik <strong>Sinkronkan</strong> untuk menarik email.
            </div>
          )}
          {threads.map((t) => {
            const active = t.id === activeThreadId
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openThread(t.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: 'var(--s-3) var(--s-4)',
                  borderBottom: '1px solid var(--border)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  border: 'none', borderLeft: t.unreadCount > 0 ? '3px solid var(--indigo)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
                }}>
                  <span style={{
                    font: `${t.unreadCount > 0 ? '600' : '500'} 13px/1.3 var(--font-sans)`,
                    color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {t.fromPreview ?? '—'}
                  </span>
                  <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)', flexShrink: 0 }}>
                    {t.lastMessageAt ? formatDate(new Date(t.lastMessageAt)) : ''}
                  </span>
                </div>
                <div style={{
                  font: `${t.unreadCount > 0 ? '600' : '500'} 12px/1.3 var(--font-sans)`,
                  color: 'var(--fg-2)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.subject ?? '(tanpa subjek)'}
                </div>
                {t.contactName && (
                  <div style={{ font: '11px/1.2 var(--font-sans)', color: 'var(--indigo)', marginTop: 3 }}>
                    {t.contactName}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Message detail */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {!detail && !loadingDetail && (
          <div style={{ padding: 'var(--s-7)', textAlign: 'center', color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)' }}>
            Pilih thread untuk melihat pesan.
          </div>
        )}
        {loadingDetail && (
          <div style={{ padding: 'var(--s-7)', textAlign: 'center', color: 'var(--fg-3)' }}>Memuat…</div>
        )}
        {detail && <ThreadView detail={detail} onReplied={(m) => {
          setDetail((d) => d ? { ...d, messages: [...d.messages, m] } : d)
          if (activeAccountId) loadThreads(activeAccountId)
        }} />}
      </main>

      {showAddAccount && isAdmin && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onCreated={(a) => {
            setAccounts((prev) => [...prev, a])
            setActiveAccountId(a.id)
            setShowAddAccount(false)
          }}
        />
      )}
    </div>
  )
}

// ── Thread view + reply composer ──────────────────────────────────────────────

function ThreadView({ detail, onReplied }: { detail: ThreadDetail; onReplied: (m: EmailMessage) => void }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [to, setTo] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const last = detail.messages[detail.messages.length - 1]
    if (last && last.direction === 'inbound') setTo(last.fromAddr)
    else setTo(last?.toAddrs?.[0] ?? '')
  }, [detail.thread.id, detail.messages])

  async function send() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/email/threads/${detail.thread.id}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: to.split(',').map((s) => s.trim()).filter(Boolean),
          text: body,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Pengiriman gagal.')
      }
      const msg = await res.json()
      onReplied(msg)
      setBody('')
      setReplyOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: 'var(--s-5)', maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ font: '600 20px/1.3 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-4)' }}>
        {detail.thread.subject ?? '(tanpa subjek)'}
      </h1>

      {detail.messages.map((m) => (
        <article key={m.id} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
          padding: 'var(--s-4)', marginBottom: 'var(--s-3)',
        }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-2)' }}>
            <div>
              <div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                {m.fromName ? `${m.fromName} <${m.fromAddr}>` : m.fromAddr}
              </div>
              <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                Ke: {m.toAddrs.join(', ')}
              </div>
            </div>
            <div style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)' }}>
              {formatDateTime(new Date(m.sentAt))}
            </div>
          </header>
          <div style={{
            font: '13px/1.6 var(--font-sans)', color: 'var(--fg-1)', whiteSpace: 'pre-wrap',
          }}>
            {m.bodyText ?? (m.bodyHtml ? stripTags(m.bodyHtml) : '(kosong)')}
          </div>
          {m.direction === 'outbound' && (
            <div style={{ marginTop: 'var(--s-2)', font: '11px/1 var(--font-mono)', color: 'var(--teal)' }}>
              ✓ Terkirim
            </div>
          )}
        </article>
      ))}

      {!replyOpen ? (
        <button
          type="button"
          onClick={() => setReplyOpen(true)}
          style={{
            height: 32, padding: '0 var(--s-4)', border: '1px solid var(--border)',
            background: 'var(--surface)', borderRadius: 'var(--r-sm)',
            font: '600 13px/1 var(--font-sans)', color: 'var(--indigo)', cursor: 'pointer',
          }}
        >
          ↵ Balas
        </button>
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--indigo)', borderRadius: 'var(--r-md)',
          padding: 'var(--s-4)', marginTop: 'var(--s-3)',
        }}>
          <label style={{ display: 'block', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>
            Kepada
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="alamat@example.com, ..."
            style={{
              width: '100%', height: 32, padding: '0 var(--s-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              font: '13px/1 var(--font-mono)', color: 'var(--fg-1)', background: 'var(--bg)',
              marginBottom: 'var(--s-3)',
            }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tulis balasan…"
            rows={6}
            style={{
              width: '100%', padding: 'var(--s-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--bg)',
              resize: 'vertical',
            }}
          />
          {error && (
            <div style={{ marginTop: 'var(--s-2)', color: 'var(--red)', font: '12px/1.4 var(--font-sans)' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s-3)' }}>
            <button
              type="button"
              onClick={send}
              disabled={sending || !to.trim() || !body.trim()}
              style={{
                height: 32, padding: '0 var(--s-4)',
                background: 'var(--indigo)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)',
                font: '600 13px/1 var(--font-sans)', cursor: sending ? 'wait' : 'pointer',
                opacity: !to.trim() || !body.trim() ? 0.5 : 1,
              }}
            >
              {sending ? 'Mengirim…' : 'Kirim'}
            </button>
            <button
              type="button"
              onClick={() => setReplyOpen(false)}
              style={{
                height: 32, padding: '0 var(--s-4)', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer',
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add account modal ────────────────────────────────────────────────────────

function AddAccountModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (a: AccountSafe) => void
}) {
  const [form, setForm] = useState({
    label: '', address: '',
    imapHost: '', imapPort: 993, imapUser: '', imapPassword: '',
    smtpHost: '', smtpPort: 465, smtpUser: '', smtpPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/email/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal menyimpan.')
      }
      onCreated(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s-4)',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto', padding: 'var(--s-5)',
      }}>
        <h2 style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-4)' }}>
          Tambah Akun Email
        </h2>

        <Field label="Label" value={form.label} onChange={(v) => update('label', v)} placeholder="Penjualan" />
        <Field label="Alamat" value={form.address} onChange={(v) => update('address', v)} placeholder="sales@perusahaan.id" />

        <Section title="IMAP (terima)" />
        <Row>
          <Field label="Host" value={form.imapHost} onChange={(v) => update('imapHost', v)} placeholder="imap.gmail.com" />
          <Field label="Port" value={String(form.imapPort)} onChange={(v) => update('imapPort', parseInt(v) || 993)} numeric />
        </Row>
        <Field label="User" value={form.imapUser} onChange={(v) => update('imapUser', v)} />
        <Field label="Password" value={form.imapPassword} onChange={(v) => update('imapPassword', v)} secret />

        <Section title="SMTP (kirim)" />
        <Row>
          <Field label="Host" value={form.smtpHost} onChange={(v) => update('smtpHost', v)} placeholder="smtp.gmail.com" />
          <Field label="Port" value={String(form.smtpPort)} onChange={(v) => update('smtpPort', parseInt(v) || 465)} numeric />
        </Row>
        <Field label="User" value={form.smtpUser} onChange={(v) => update('smtpUser', v)} />
        <Field label="Password" value={form.smtpPassword} onChange={(v) => update('smtpPassword', v)} secret />

        {error && (
          <div style={{ marginTop: 'var(--s-3)', color: 'var(--red)', font: '12px/1.4 var(--font-sans)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s-4)', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32, padding: '0 var(--s-4)', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer',
            }}
          >Batal</button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              height: 32, padding: '0 var(--s-4)',
              background: 'var(--indigo)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)',
              font: '600 13px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer',
            }}
          >{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, secret, numeric }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; secret?: boolean; numeric?: boolean
}) {
  return (
    <div style={{ marginBottom: 'var(--s-2)', flex: 1 }}>
      <label style={{ display: 'block', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={secret ? 'password' : numeric ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 30, padding: '0 var(--s-3)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
          font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)',
        }}
      />
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div style={{
      font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      margin: 'var(--s-4) 0 var(--s-2)',
    }}>{title}</div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 8 }}>{children}</div>
}

function formatDate(d: Date): string {
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
