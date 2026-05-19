'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@kantorcore/ui'

interface SessionRow {
  token: string
  fullToken: string
  createdAt: string
  expiresAt: string
  ip: string | null
  userAgent: string | null
  lastSeenAt: string | null
  isCurrent: boolean
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-3)' }}>
      <h2 style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{title}</h2>
      {action}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--s-4)',
        background: 'var(--bg-1)',
        marginBottom: 'var(--s-5)',
      }}
    >
      {children}
    </div>
  )
}

function TotpSection({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [step, setStep] = useState<'idle' | 'setup' | 'confirm' | 'backupCodes' | 'disable'>('idle')
  const [secret, setSecret] = useState<string | null>(null)
  const [uri, setUri] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function startSetup() {
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/totp/setup', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setPending(false); return }
    setSecret(data.secret)
    setUri(data.uri)
    setStep('setup')
    setPending(false)
  }

  async function confirmEnable() {
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/totp/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.replace(/\s/g, '') }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setPending(false); return }
    setBackupCodes(data.backupCodes)
    setEnabled(true)
    setStep('backupCodes')
    setCode('')
    setPending(false)
  }

  async function confirmDisable() {
    setError(null)
    setPending(true)
    const res = await fetch('/api/auth/totp', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setPending(false); return }
    setEnabled(false)
    setStep('idle')
    setPassword('')
    setPending(false)
  }

  return (
    <Card>
      <SectionHeader title="Autentikasi Dua Faktor (2FA)" />
      <p style={{ font: '14px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: '0 0 var(--s-4)' }}>
        {enabled
          ? '2FA aktif. Kode dari aplikasi autentikasi diperlukan saat masuk.'
          : '2FA tidak aktif. Aktifkan untuk keamanan ekstra.'}
      </p>

      {error && (
        <div style={{ padding: 'var(--s-2) var(--s-3)', background: 'var(--red-light)', borderRadius: 'var(--r-sm)', color: 'var(--red)', font: '13px/1.4 var(--font-sans)', marginBottom: 'var(--s-3)' }}>
          {error}
        </div>
      )}

      {step === 'idle' && !enabled && (
        <Button variant="primary" size="sm" onClick={startSetup} disabled={pending}>
          {pending ? 'Memuat…' : 'Aktifkan 2FA'}
        </Button>
      )}

      {step === 'setup' && secret && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <div>
            <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: '0 0 var(--s-2)' }}>
              1. Buka aplikasi autentikasi (Google Authenticator, Authy, dll.) dan tambahkan akun baru secara manual menggunakan kode di bawah.
            </p>
            <div style={{ padding: 'var(--s-3)', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', font: '14px/1 var(--font-mono)', letterSpacing: 2, color: 'var(--fg-1)', wordBreak: 'break-all' }}>
              {secret}
            </div>
            <p style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', margin: 'var(--s-2) 0 0' }}>
              Atau buka link ini dari perangkat mobile:{' '}
              <a href={uri ?? ''} style={{ color: 'var(--indigo)', wordBreak: 'break-all' }}>
                otpauth://…
              </a>
            </p>
          </div>
          <div>
            <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: '0 0 var(--s-2)' }}>
              2. Masukkan kode 6 digit dari aplikasi untuk mengonfirmasi.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                style={{
                  width: 120, padding: '6px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', font: '16px/1 var(--font-mono)',
                  letterSpacing: 4, textAlign: 'center', background: 'var(--bg-1)', color: 'var(--fg-1)',
                }}
              />
              <Button variant="primary" size="sm" onClick={confirmEnable} disabled={pending || code.replace(/\s/g, '').length < 6}>
                {pending ? 'Memverifikasi…' : 'Konfirmasi'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setCode(''); setError(null) }} disabled={pending}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'backupCodes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <p style={{ font: '14px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
            2FA berhasil diaktifkan. Simpan kode cadangan ini di tempat yang aman — masing-masing hanya bisa digunakan sekali.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-2)', padding: 'var(--s-3)', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)' }}>
            {backupCodes.map((c) => (
              <span key={c} style={{ font: '13px/1 var(--font-mono)', color: 'var(--fg-1)' }}>{c}</span>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={() => setStep('idle')}>Selesai</Button>
        </div>
      )}

      {step === 'idle' && enabled && (
        <Button variant="ghost" size="sm" onClick={() => { setStep('disable'); setError(null) }}>
          Nonaktifkan 2FA
        </Button>
      )}

      {step === 'disable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <p style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', margin: 0 }}>
            Konfirmasi kata sandi untuk menonaktifkan 2FA.
          </p>
          <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi"
              autoComplete="current-password"
              style={{
                padding: '6px 10px', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', font: '14px/1 var(--font-sans)',
                background: 'var(--bg-1)', color: 'var(--fg-1)', width: 200,
              }}
            />
            <Button variant="primary" size="sm" onClick={confirmDisable} disabled={pending || !password}>
              {pending ? 'Memproses…' : 'Nonaktifkan'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setPassword(''); setError(null) }} disabled={pending}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function SessionsSection(_props: { currentSessionToken: string }) {
  const [sessionList, setSessionList] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [terminating, setTerminating] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/auth/sessions')
    if (res.ok) {
      const data = await res.json()
      setSessionList(data.sessions)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function terminateSession(fullToken: string) {
    setTerminating(fullToken)
    await fetch(`/api/auth/sessions/${fullToken}`, { method: 'DELETE' })
    await loadSessions()
    setTerminating(null)
  }

  async function terminateAll() {
    setTerminating('all')
    await fetch('/api/auth/sessions', { method: 'DELETE' })
    await loadSessions()
    setTerminating(null)
  }

  const others = sessionList.filter((s) => !s.isCurrent)

  return (
    <Card>
      <SectionHeader
        title="Sesi Aktif"
        action={
          others.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={terminateAll} disabled={terminating === 'all'}>
              {terminating === 'all' ? 'Menghentikan…' : 'Hentikan semua sesi lain'}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>Memuat…</p>
      ) : sessionList.length === 0 ? (
        <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>Tidak ada sesi aktif.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sessionList.map((s) => (
            <div
              key={s.fullToken}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--s-3)',
                padding: 'var(--s-3)', borderRadius: 'var(--r-sm)',
                background: s.isCurrent ? 'var(--indigo-light)' : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>
                  {s.userAgent ? shortenUA(s.userAgent) : 'Browser tidak diketahui'}
                  {s.isCurrent && (
                    <span style={{ marginLeft: 8, font: '11px/1 var(--font-sans)', color: 'var(--indigo)', background: 'var(--indigo-light)', padding: '2px 6px', borderRadius: 4 }}>
                      Sesi ini
                    </span>
                  )}
                </div>
                <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                  {s.ip ?? 'IP tidak diketahui'} · Dibuat {new Date(s.createdAt).toLocaleDateString('id-ID')}
                </div>
              </div>
              {!s.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => terminateSession(s.fullToken)}
                  disabled={terminating === s.fullToken}
                >
                  {terminating === s.fullToken ? '…' : 'Hentikan'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function shortenUA(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return ua.slice(0, 40)
}

export function SecuritySettings({
  totpEnabled,
  currentSessionToken,
}: {
  totpEnabled: boolean
  currentSessionToken: string
}) {
  return (
    <div style={{ maxWidth: 600, padding: 'var(--s-6)' }}>
      <h1 style={{ font: '700 20px/1 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-6)' }}>
        Keamanan
      </h1>
      <TotpSection initialEnabled={totpEnabled} />
      <SessionsSection currentSessionToken={currentSessionToken} />
    </div>
  )
}
