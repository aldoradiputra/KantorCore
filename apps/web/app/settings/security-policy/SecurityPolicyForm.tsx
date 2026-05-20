'use client'

import { useState } from 'react'
import type { WorkspaceSecurityPolicy } from '@kantorcore/db'

export default function SecurityPolicyForm({ policy: initial }: { policy: WorkspaceSecurityPolicy | null }) {
  const [require2fa, setRequire2fa] = useState(initial?.require2fa ?? false)
  const [pwdMin, setPwdMin] = useState(initial?.passwordMinLength ?? 8)
  const [sessionHours, setSessionHours] = useState(initial?.sessionTimeoutHours ?? 720)
  const [ipList, setIpList] = useState((initial?.ipAllowlist ?? []).join('\n'))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving'); setError('')
    const ipAllowlist = ipList.split('\n').map((s) => s.trim()).filter(Boolean)
    const res = await fetch('/api/settings/security-policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ require2fa, passwordMinLength: pwdMin, sessionTimeoutHours: sessionHours, ipAllowlist }),
    })
    if (res.ok) {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Gagal menyimpan kebijakan.'); setStatus('error')
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <div style={{ marginBottom: 'var(--s-6)' }}>
          <h2 style={{ margin: 0 }}>Kebijakan Keamanan</h2>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Atur kebijakan keamanan yang berlaku untuk seluruh anggota workspace.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(179,90,0,0.08)', border: '1px solid rgba(179,90,0,0.2)', borderRadius: 'var(--r-sm)', font: '500 12px/1.4 var(--font-sans)', color: 'var(--amber)' }}>
              {error}
            </div>
          )}

          {/* 2FA enforcement */}
          <PolicyCard
            title="Wajibkan Autentikasi Dua Faktor (2FA)"
            description="Anggota yang belum mengaktifkan TOTP akan diblokir di layar verifikasi hingga mereka mendaftar. Pastikan seluruh anggota sudah siap sebelum mengaktifkan."
            badge={require2fa ? { label: 'Aktif', color: 'var(--teal)' } : { label: 'Tidak Aktif', color: 'var(--fg-3)' }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <Toggle checked={require2fa} onChange={setRequire2fa} />
              <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
                {require2fa ? 'Wajib 2FA diaktifkan' : 'Tidak diwajibkan'}
              </span>
            </label>
          </PolicyCard>

          {/* Password policy */}
          <PolicyCard
            title="Kebijakan Kata Sandi"
            description="Panjang minimum kata sandi yang diterapkan saat anggota mendaftar atau mengubah kata sandi."
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>Minimal</span>
              <input
                type="number"
                min={6}
                max={128}
                value={pwdMin}
                onChange={(e) => setPwdMin(Number(e.target.value))}
                style={{ width: 72, height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '400 14px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none', textAlign: 'center' }}
              />
              <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>karakter</span>
            </label>
          </PolicyCard>

          {/* Session timeout */}
          <PolicyCard
            title="Batas Waktu Sesi"
            description="Sesi idle otomatis berakhir setelah durasi ini. 720 jam = 30 hari (default). Minimum 1 jam."
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={1}
                max={8760}
                value={sessionHours}
                onChange={(e) => setSessionHours(Number(e.target.value))}
                style={{ width: 90, height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '400 14px/1 var(--font-sans)', color: 'var(--fg-1)', outline: 'none', textAlign: 'center' }}
              />
              <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>jam</span>
              <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                ({Math.round(sessionHours / 24)} hari)
              </span>
            </div>
          </PolicyCard>

          {/* IP allowlist */}
          <PolicyCard
            title="Daftar IP yang Diizinkan"
            description="Satu entri per baris dalam format CIDR (mis. 203.0.113.0/24) atau IP tunggal. Kosongkan untuk mengizinkan semua IP."
            badge={ipList.trim() ? { label: `${ipList.split('\n').filter((s) => s.trim()).length} entri`, color: 'var(--amber)' } : { label: 'Semua IP', color: 'var(--fg-3)' }}
          >
            <textarea
              value={ipList}
              onChange={(e) => setIpList(e.target.value)}
              placeholder={'203.0.113.0/24\n10.0.0.1'}
              rows={4}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)', font: '400 12px/1.5 var(--font-mono)', color: 'var(--fg-1)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <p style={{ font: '400 11px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
              Hati-hati: jika Anda salah konfigurasi IP, Anda bisa terkunci dari workspace sendiri.
            </p>
          </PolicyCard>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', paddingTop: 4 }}>
            <button
              type="submit"
              disabled={status === 'saving'}
              style={{ height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: status === 'saving' ? 'wait' : 'pointer' }}
            >
              {status === 'saving' ? 'Menyimpan…' : 'Simpan Kebijakan'}
            </button>
            {status === 'saved' && <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--teal)' }}>Tersimpan ✓</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

function PolicyCard({ title, description, badge, children }: {
  title: string
  description: string
  badge?: { label: string; color: string }
  children: React.ReactNode
}) {
  return (
    <div style={{ padding: 'var(--s-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
        <div>
          <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{title}</div>
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4, maxWidth: 480 }}>{description}</div>
        </div>
        {badge && (
          <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: badge.color, border: `1px solid ${badge.color}`, padding: '3px 7px', borderRadius: 999, flexShrink: 0 }}>
            {badge.label}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: checked ? 'var(--teal)' : 'var(--border)',
        position: 'relative', transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16,
        borderRadius: '50%', background: 'var(--white)',
        transition: 'left 0.15s', display: 'block',
      }} />
    </button>
  )
}
