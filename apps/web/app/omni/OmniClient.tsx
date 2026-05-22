'use client'

import { useCallback, useEffect, useState } from 'react'
import type { OmniChannel, OmniConvStatus, OmniChannelType } from '../../lib/omni'
import type { OmniConversation, OmniMessage } from '@kantorcore/db'

type ChannelWithToken = OmniChannel & { widgetToken: string | null }
type ConvListItem = OmniConversation & { channelName: string; channelType: OmniChannelType; lastBody: string | null }
type ConvDetail = { conv: OmniConversation; messages: OmniMessage[]; channel: OmniChannel }

const CHANNEL_TYPE_LABEL: Record<OmniChannelType, string> = {
  email:    'Email',
  web_chat: 'Web Chat',
  whatsapp: 'WhatsApp',
  sms:      'SMS',
}

const CHANNEL_TYPE_ICON: Record<OmniChannelType, string> = {
  email: '✉', web_chat: '💬', whatsapp: '📱', sms: '📲',
}

const STATUS_LABEL: Record<OmniConvStatus, string> = {
  open: 'Terbuka', pending: 'Menunggu', resolved: 'Selesai', snoozed: 'Tunda',
}

export default function OmniClient({
  initialChannels,
  isAdmin,
  currentUserId,
  currentUserName,
}: {
  initialChannels: ChannelWithToken[]
  isAdmin: boolean
  currentUserId: string
  currentUserName: string
}) {
  const [channels, setChannels] = useState(initialChannels)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(initialChannels[0]?.id ?? null)
  const [convs, setConvs] = useState<ConvListItem[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConvDetail | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddChannel, setShowAddChannel] = useState(channels.length === 0)
  const [showWidget, setShowWidget] = useState(false)

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

  const loadConvs = useCallback(async (channelId: string) => {
    setLoadingConvs(true)
    try {
      const res = await fetch(`/api/omni/conversations?channelId=${channelId}&status=open`)
      if (res.ok) setConvs(await res.json())
    } finally { setLoadingConvs(false) }
  }, [])

  useEffect(() => {
    if (activeChannelId) loadConvs(activeChannelId)
  }, [activeChannelId, loadConvs])

  const openConv = useCallback(async (convId: string) => {
    setActiveConvId(convId)
    try {
      const res = await fetch(`/api/omni/conversations/${convId}`)
      if (res.ok) {
        setDetail(await res.json())
        setConvs((prev) => prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c))
      }
    } catch { /* ignore */ }
  }, [])

  async function sendReply() {
    if (!reply.trim() || !activeConvId) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/omni/conversations/${activeConvId}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal mengirim.')
      }
      const msg = await res.json()
      setDetail((d) => d ? { ...d, messages: [...d.messages, msg] } : d)
      setReply('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSending(false) }
  }

  async function changeStatus(status: OmniConvStatus) {
    if (!activeConvId) return
    await fetch(`/api/omni/conversations/${activeConvId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setDetail((d) => d ? { ...d, conv: { ...d.conv, status } } : d)
    setConvs((prev) => prev.filter((c) => c.id !== activeConvId))
    setActiveConvId(null); setDetail(null)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Channel sidebar */}
      <aside style={{
        width: 220, borderRight: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: 'var(--s-4)', borderBottom: '1px solid var(--border)' }}>
          <div className="t-micro" style={{ color: 'var(--fg-3)' }}>Omnichannel</div>
          <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)', marginTop: 2 }}>
            Kotak Masuk
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-2)' }}>
          {channels.length === 0 && (
            <div style={{ padding: 'var(--s-3)', font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
              Belum ada channel.
            </div>
          )}
          {channels.map((ch) => {
            const active = ch.id === activeChannelId
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setActiveChannelId(ch.id)
                  setDetail(null); setActiveConvId(null)
                  setShowWidget(false)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: 'var(--s-2) var(--s-3)', borderRadius: 'var(--r-sm)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  border: 'none', cursor: 'pointer', marginBottom: 2,
                  color: active ? 'var(--indigo)' : 'var(--fg-1)',
                  font: `${active ? '600' : '500'} 13px/1.3 var(--font-sans)`,
                }}
              >
                <span style={{ marginRight: 6 }}>{CHANNEL_TYPE_ICON[ch.type]}</span>
                {ch.name}
                <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                  {CHANNEL_TYPE_LABEL[ch.type]}
                </div>
              </button>
            )
          })}
        </nav>

        {isAdmin && (
          <div style={{ padding: 'var(--s-3)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowAddChannel(true)}
              style={secondaryBtnStyle}
            >
              + Tambah Channel
            </button>
            {activeChannel?.type === 'web_chat' && activeChannel.widgetToken && (
              <button
                type="button"
                onClick={() => setShowWidget(true)}
                style={secondaryBtnStyle}
              >
                {'</>'} Pasang Widget
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Conversation list */}
      <section style={{
        width: 340, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <header style={{
          padding: 'var(--s-3) var(--s-4)', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>
            {activeChannel
              ? `${CHANNEL_TYPE_ICON[activeChannel.type]} ${activeChannel.name}`
              : '—'}
          </div>
          {activeChannel && (
            <button
              type="button"
              onClick={() => activeChannelId && loadConvs(activeChannelId)}
              style={secondaryBtnStyle}
            >
              ↻
            </button>
          )}
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs && <Muted>Memuat…</Muted>}
          {!loadingConvs && convs.length === 0 && (
            <Muted>Belum ada percakapan terbuka.</Muted>
          )}
          {convs.map((c) => {
            const active = c.id === activeConvId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openConv(c.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: 'var(--s-3) var(--s-4)',
                  borderBottom: '1px solid var(--border)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  border: 'none',
                  borderLeft: c.unreadCount > 0 ? '3px solid var(--indigo)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{
                    font: `${c.unreadCount > 0 ? '600' : '500'} 13px/1.3 var(--font-sans)`,
                    color: 'var(--fg-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.contactName ?? c.contactIdentifier ?? 'Pengunjung'}
                  </span>
                  <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-3)', flexShrink: 0 }}>
                    {c.lastMessageAt ? relativeDate(new Date(c.lastMessageAt)) : ''}
                  </span>
                </div>
                {c.subject && (
                  <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.subject}
                  </div>
                )}
                <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.lastBody ?? '…'}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Conversation detail */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {showWidget && activeChannel?.type === 'web_chat' && activeChannel.widgetToken ? (
          <WidgetInstallGuide token={activeChannel.widgetToken} onClose={() => setShowWidget(false)} />
        ) : !detail ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', font: '13px/1.5 var(--font-sans)' }}>
            Pilih percakapan untuk melihat pesan.
          </div>
        ) : (
          <>
            {/* Header */}
            <header style={{
              padding: 'var(--s-3) var(--s-5)', borderBottom: '1px solid var(--border)',
              background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {detail.conv.contactName ?? detail.conv.contactIdentifier ?? 'Pengunjung'}
                </div>
                {detail.conv.subject && (
                  <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{detail.conv.subject}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  font: '600 11px/1 var(--font-sans)', padding: '3px 8px',
                  borderRadius: 999, border: '1px solid var(--border)',
                  color: 'var(--fg-2)',
                }}>
                  {STATUS_LABEL[detail.conv.status]}
                </span>
                {detail.conv.status === 'open' && (
                  <button type="button" onClick={() => changeStatus('resolved')} style={secondaryBtnStyle}>
                    ✓ Selesaikan
                  </button>
                )}
                {detail.conv.status !== 'open' && (
                  <button type="button" onClick={() => changeStatus('open')} style={secondaryBtnStyle}>
                    ↩ Buka Kembali
                  </button>
                )}
              </div>
            </header>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-4) var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {detail.messages.map((m) => {
                const isOut = m.direction === 'outbound'
                return (
                  <div key={m.id} style={{
                    alignSelf: isOut ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                  }}>
                    <div style={{
                      background: isOut ? 'var(--indigo)' : 'var(--surface)',
                      color: isOut ? 'white' : 'var(--fg-1)',
                      border: isOut ? 'none' : '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: 'var(--s-2) var(--s-3)',
                      font: '13px/1.5 var(--font-sans)',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {m.body}
                    </div>
                    <div style={{ font: '11px/1.2 var(--font-mono)', color: 'var(--fg-3)', marginTop: 3, textAlign: isOut ? 'right' : 'left' }}>
                      {m.fromName ?? ''} · {relativeDate(new Date(m.sentAt))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Reply box */}
            <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--s-3) var(--s-5)', flexShrink: 0 }}>
              {error && <div style={{ color: 'var(--red)', font: '12px/1.4 var(--font-sans)', marginBottom: 8 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                  rows={2}
                  placeholder="Tulis balasan… (⌘+Enter untuk kirim)"
                  style={{
                    flex: 1, padding: 'var(--s-2) var(--s-3)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                    font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)',
                    background: 'var(--surface)', resize: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  style={{
                    alignSelf: 'flex-end', height: 32, padding: '0 var(--s-4)',
                    background: reply.trim() ? 'var(--indigo)' : 'var(--border)',
                    color: reply.trim() ? 'white' : 'var(--fg-3)',
                    border: 'none', borderRadius: 'var(--r-sm)',
                    font: '600 13px/1 var(--font-sans)', cursor: sending ? 'wait' : 'pointer',
                  }}
                >
                  {sending ? '…' : 'Kirim'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showAddChannel && isAdmin && (
        <AddChannelModal
          onClose={() => setShowAddChannel(false)}
          onCreated={(ch) => {
            setChannels((prev) => [...prev, ch])
            setActiveChannelId(ch.id)
            setShowAddChannel(false)
          }}
        />
      )}
    </div>
  )
}

// ── Widget install guide ───────────────────────────────────────────────────────

function WidgetInstallGuide({ token, onClose }: { token: string; onClose: () => void }) {
  const snippet = `<script>
  (function(w,d,t){
    w.__omniToken=t;
    var s=d.createElement('script');
    s.src=window.location.origin+'/api/omni/widget/bundle.js';
    s.async=true;d.head.appendChild(s);
  })(window,document,'${token}');
</script>`

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-6)' }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
          <h2 style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Pasang Widget Web Chat
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', font: '18px/1 var(--font-sans)' }}>✕</button>
        </div>
        <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: '0 0 var(--s-4)' }}>
          Tempel kode berikut sebelum tag <code>&lt;/body&gt;</code> di website Anda:
        </p>
        <pre style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
          padding: 'var(--s-4)', font: '12px/1.6 var(--font-mono)', color: 'var(--fg-1)',
          overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {snippet}
        </pre>
        <p style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 'var(--s-3)' }}>
          Token widget: <code style={{ font: '12px/1 var(--font-mono)', color: 'var(--indigo)' }}>{token}</code>
        </p>
      </div>
    </div>
  )
}

// ── Add channel modal ─────────────────────────────────────────────────────────

const CHANNEL_TYPES: { value: OmniChannelType; label: string; soon?: boolean }[] = [
  { value: 'web_chat',  label: '💬 Web Chat' },
  { value: 'email',     label: '✉ Email' },
  { value: 'whatsapp',  label: '📱 WhatsApp', soon: true },
  { value: 'sms',       label: '📲 SMS', soon: true },
]

function AddChannelModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (ch: ChannelWithToken) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<OmniChannelType>('web_chat')
  const [emailAccountId, setEmailAccountId] = useState('')
  const [greeting, setGreeting] = useState('Halo! Ada yang bisa kami bantu?')
  const [widgetColor, setWidgetColor] = useState('#3B4FC4')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true); setError(null)
    try {
      const config: Record<string, string> = {}
      if (type === 'email') config.emailAccountId = emailAccountId
      if (type === 'web_chat') { config.greeting = greeting; config.widgetColor = widgetColor }

      const res = await fetch('/api/omni/channels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type, config }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal menyimpan.')
      }
      onCreated(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s-4)',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 480,
        padding: 'var(--s-5)',
      }}>
        <h2 style={{ font: '600 15px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-4)' }}>
          Tambah Channel
        </h2>

        <ModalField label="Nama Channel">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Support, Sales, WhatsApp…" style={inputSt} />
        </ModalField>

        <ModalField label="Tipe">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CHANNEL_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                disabled={ct.soon}
                onClick={() => !ct.soon && setType(ct.value)}
                style={{
                  height: 32, padding: '0 var(--s-3)',
                  border: `1px solid ${type === ct.value ? 'var(--indigo)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-sm)',
                  background: type === ct.value ? 'var(--indigo-light)' : ct.soon ? 'var(--bg)' : 'transparent',
                  color: ct.soon ? 'var(--fg-3)' : type === ct.value ? 'var(--indigo)' : 'var(--fg-2)',
                  font: '12px/1 var(--font-sans)', cursor: ct.soon ? 'default' : 'pointer',
                }}
              >
                {ct.label}{ct.soon ? ' (Segera)' : ''}
              </button>
            ))}
          </div>
        </ModalField>

        {type === 'email' && (
          <ModalField label="ID Akun Email (IS-EMAIL)">
            <input type="text" value={emailAccountId} onChange={(e) => setEmailAccountId(e.target.value)}
              placeholder="UUID akun email" style={inputSt} />
          </ModalField>
        )}
        {type === 'web_chat' && (
          <>
            <ModalField label="Pesan Sambutan">
              <input type="text" value={greeting} onChange={(e) => setGreeting(e.target.value)} style={inputSt} />
            </ModalField>
            <ModalField label="Warna Widget">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)}
                  style={{ width: 36, height: 28, border: '1px solid var(--border)', borderRadius: 4, padding: 2 }} />
                <code style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{widgetColor}</code>
              </div>
            </ModalField>
          </>
        )}

        {error && <div style={{ color: 'var(--red)', font: '12px/1.4 var(--font-sans)', marginTop: 'var(--s-3)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--s-4)' }}>
          <button type="button" onClick={onClose} style={{ ...secondaryBtnStyle, height: 32, padding: '0 var(--s-4)' }}>Batal</button>
          <button
            type="button" onClick={save} disabled={saving || !name.trim()}
            style={{
              height: 32, padding: '0 var(--s-4)',
              background: name.trim() ? 'var(--indigo)' : 'var(--border)',
              color: name.trim() ? 'white' : 'var(--fg-3)',
              border: 'none', borderRadius: 'var(--r-sm)',
              font: '600 13px/1 var(--font-sans)', cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 'var(--s-5)', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center' }}>
      {children}
    </div>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s-3)' }}>
      <label style={{ display: 'block', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function relativeDate(d: Date): string {
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'baru saja'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt lalu`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

const inputSt: React.CSSProperties = {
  width: '100%', height: 30, padding: '0 var(--s-3)',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)',
}

const secondaryBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 var(--s-3)',
  border: '1px solid var(--border)', background: 'var(--surface)',
  borderRadius: 'var(--r-sm)', font: '12px/1 var(--font-sans)',
  color: 'var(--fg-2)', cursor: 'pointer',
}

