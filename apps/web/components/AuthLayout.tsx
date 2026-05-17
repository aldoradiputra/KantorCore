import Link from 'next/link'
import type { ReactNode } from 'react'

export function AuthShell({
  title,
  subtitle,
  children,
  footerHref,
  footerText,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footerHref: string
  footerText: string
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 'var(--s-5)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--s-6)',
        }}
      >
        <div style={{ marginBottom: 'var(--s-5)' }}>
          <div
            style={{
              font: '700 18px/1 var(--font-sans)',
              color: 'var(--navy)',
              letterSpacing: '-0.2px',
              marginBottom: 'var(--s-3)',
            }}
          >
            Kantr
          </div>
          <h1 style={{ margin: 0, marginBottom: 'var(--s-2)' }}>{title}</h1>
          <p style={{ margin: 0, color: 'var(--fg-3)', font: '400 13px/1.5 var(--font-sans)' }}>
            {subtitle}
          </p>
        </div>
        {children}
        <div
          style={{
            marginTop: 'var(--s-5)',
            paddingTop: 'var(--s-4)',
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
            font: '400 13px/1 var(--font-sans)',
          }}
        >
          <Link href={footerHref} style={{ color: 'var(--indigo)' }}>
            {footerText}
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
  hint,
}: {
  label: string
  type: 'text' | 'email' | 'password'
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  hint?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        style={{
          height: 36,
          padding: '0 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          background: 'var(--bg)',
          font: '400 14px/1 var(--font-sans)',
          color: 'var(--fg-1)',
          outline: 'none',
        }}
      />
      {hint && (
        <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{hint}</span>
      )}
    </label>
  )
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        padding: '10px 12px',
        background: 'rgba(179, 90, 0, 0.08)',
        border: '1px solid rgba(179, 90, 0, 0.2)',
        borderRadius: 'var(--r-sm)',
        font: '500 12px/1.4 var(--font-sans)',
        color: 'var(--amber)',
      }}
    >
      {children}
    </div>
  )
}
