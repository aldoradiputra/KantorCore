'use client'

import { useState } from 'react'
import type { Invite } from '@kantorcore/db'
import type { MemberRow } from '../../../lib/settings'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Pemilik',
  admin: 'Admin',
  member: 'Anggota',
}

export default function MembersPanel({
  tenantId,
  currentUserId,
  members: initialMembers,
  pendingInvites: initialInvites,
}: {
  tenantId: string
  currentUserId: string
  members: MemberRow[]
  pendingInvites: Invite[]
}) {
  const [members] = useState(initialMembers)
  const [invites, setInvites] = useState(initialInvites)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newLink, setNewLink] = useState<string | null>(null)

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null); setNewLink(null)
    const res = await fetch('/api/settings/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.invite) {
      const link = `${window.location.origin}/invites/${data.invite.token}`
      setNewLink(link)
      setEmail('')
      setInvites((prev) => {
        const filtered = prev.filter((i) => i.email !== data.invite.email)
        return [...filtered, data.invite]
      })
    } else {
      setError(data.error ?? 'Gagal membuat undangan.')
    }
    setPending(false)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        <h2 style={{ marginBottom: 'var(--s-6)' }}>Anggota & Undangan</h2>

        {/* Member list */}
        <Section title={`Anggota (${members.length})`}>
          {members.map((row) => (
            <div
              key={row.membership.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px var(--s-3)', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {row.user.name}
                  {row.user.id === currentUserId && (
                    <span style={{ marginLeft: 6, font: '500 10px/1 var(--font-sans)', color: 'var(--fg-3)', border: '1px solid var(--border)', padding: '2px 5px', borderRadius: 3 }}>
                      Anda
                    </span>
                  )}
                </span>
                <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{row.user.email}</span>
              </div>
              <RoleBadge role={row.membership.role} />
            </div>
          ))}
        </Section>

        {/* Pending invites */}
        {invites.length > 0 && (
          <Section title={`Undangan tertunda (${invites.length})`}>
            {invites.map((inv) => (
              <div
                key={inv.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px var(--s-3)', borderBottom: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{inv.email}</span>
                  <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                    Kedaluwarsa {new Date(inv.expiresAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <RoleBadge role={inv.role} />
              </div>
            ))}
          </Section>
        )}

        {/* Invite form */}
        <Section title="Undang anggota baru">
          {error && (
            <div role="alert" style={{ marginBottom: 'var(--s-3)', padding: '10px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)' }}>
              {error}
            </div>
          )}
          {newLink && (
            <div style={{ marginBottom: 'var(--s-4)', padding: 'var(--s-3)', background: 'var(--teal-light)', border: '1px solid rgba(15,123,108,0.2)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--teal)', marginBottom: 6 }}>
                Undangan dibuat. Salin link ini dan kirim ke calon anggota:
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}>
                <code style={{ flex: 1, font: '400 11px/1.4 var(--font-mono)', color: 'var(--fg-2)', wordBreak: 'break-all' }}>
                  {newLink}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(newLink)}
                  style={{ height: 28, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--surface)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-2)', cursor: 'pointer', flexShrink: 0 }}
                >
                  Salin
                </button>
              </div>
            </div>
          )}
          <form onSubmit={onInvite} style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'flex-end' }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="kolega@perusahaan.com"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '400 14px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="member">Anggota</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={pending || !email.trim()}
              style={{ height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', cursor: pending || !email.trim() ? 'not-allowed' : 'pointer', opacity: pending || !email.trim() ? 0.6 : 1 }}
            >
              {pending ? 'Memproses…' : 'Undang'}
            </button>
          </form>
          <p style={{ font: '400 11px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 'var(--s-3) 0 0' }}>
            Pengiriman email otomatis tersedia saat IS-EMAIL shipped. Untuk sekarang, salin dan kirim link undangan secara manual.
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s-6)' }}>
      <div className="t-micro" style={{ marginBottom: 'var(--s-3)' }}>{title}</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const color = role === 'owner' ? 'var(--indigo)' : role === 'admin' ? 'var(--teal)' : 'var(--fg-3)'
  return (
    <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.8px', color, border: '1px solid var(--border)', padding: '3px 6px', borderRadius: 3 }}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}
