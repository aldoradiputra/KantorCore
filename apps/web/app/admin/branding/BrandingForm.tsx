'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Branding {
  logoUrl:    string | null
  brandColor: string | null
  loginBgUrl: string | null
}

export default function BrandingForm({
  initial,
  tenantName,
}: {
  initial: Branding
  tenantName: string
}) {
  const router = useRouter()
  const [logoUrl,    setLogoUrl]    = useState(initial.logoUrl    ?? '')
  const [brandColor, setBrandColor] = useState(initial.brandColor ?? '#3B4FC4')
  const [loginBgUrl, setLoginBgUrl] = useState(initial.loginBgUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [saved, setSaved]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/tenant/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl:    logoUrl.trim()    || null,
          brandColor: brandColor.trim() || null,
          loginBgUrl: loginBgUrl.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Gagal menyimpan branding.')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Reset semua branding ke default KantorCore?')) return
    setSaving(true); setError(null)
    try {
      await fetch('/api/tenant/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: null, brandColor: null, loginBgUrl: null }),
      })
      setLogoUrl(''); setBrandColor('#3B4FC4'); setLoginBgUrl('')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      {/* Preview */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}>
        <div className="t-micro" style={{ padding: 'var(--s-3) var(--s-4)', borderBottom: '1px solid var(--border)', color: 'var(--fg-3)' }}>
          Pratinjau Topbar
        </div>
        <div style={{
          padding: 'var(--s-4)',
          background: 'var(--bg)',
          borderTop: `3px solid ${brandColor || '#3B4FC4'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-3)',
        }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} height={20} style={{ height: 20, width: 'auto', maxWidth: 160, objectFit: 'contain' }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/kantorcore-lockup.svg" alt="KantorCore" height={20} style={{ height: 20 }} />
          )}
          <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{tenantName}</span>
        </div>
      </div>

      {/* Logo URL */}
      <Field
        label="URL Logo"
        hint="URL ke logo workspace Anda (PNG/SVG). Tinggi optimal: 40px. Penyedia penyimpanan internal akan tersedia menyusul — untuk saat ini, hosting eksternal (e.g., Cloudinary, S3 publik)."
      >
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://contoh.com/logo.svg"
          style={inputStyle}
        />
      </Field>

      {/* Brand color */}
      <Field
        label="Warna Brand"
        hint="Digunakan untuk aksen chrome (garis topbar, latar layar masuk). Tombol & tautan menggunakan warna aksen pribadi pengguna."
      >
        <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}>
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            style={{
              width: 44, height: 36, padding: 0, border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            placeholder="#3B4FC4"
            pattern="^#[0-9A-Fa-f]{6}$"
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', width: 140 }}
          />
        </div>
      </Field>

      {/* Login background */}
      <Field
        label="URL Latar Layar Masuk (opsional)"
        hint="Gambar latar belakang untuk halaman login. Lebar optimal: 1920px. Disarankan ratio 16:9."
      >
        <input
          type="url"
          value={loginBgUrl}
          onChange={(e) => setLoginBgUrl(e.target.value)}
          placeholder="https://contoh.com/login-bg.jpg"
          style={inputStyle}
        />
      </Field>

      {error && (
        <div style={{
          padding: 'var(--s-3)',
          background: 'var(--red-light)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--r-sm)',
          font: '13px/1.4 var(--font-sans)',
          color: 'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {saved && (
        <div style={{
          padding: 'var(--s-3)',
          background: 'var(--teal-light)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--r-sm)',
          font: '13px/1.4 var(--font-sans)',
          color: 'var(--success)',
        }}>
          Branding tersimpan. Perubahan akan terlihat saat memuat ulang halaman.
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)',
            color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
            font: '600 13px/1 var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Menyimpan…' : 'Simpan Branding'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          style={{
            height: 36, padding: '0 var(--s-4)', background: 'transparent',
            color: 'var(--fg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          Reset ke Default
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{label}</label>
      {children}
      {hint && (
        <div style={{ font: '11px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</div>
      )}
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
  background: 'var(--surface)',
  width: '100%',
}
