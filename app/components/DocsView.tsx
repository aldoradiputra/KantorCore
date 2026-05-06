'use client'

export default function DocsView() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 12,
      color: 'var(--muted)',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        background: 'var(--indigo-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--indigo)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      </div>
      <h2 style={{ color: 'var(--navy)', fontSize: 18, fontWeight: 700 }}>Documentation</h2>
      <p style={{ fontSize: 13, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        Coming soon. The full documentation portal lands in Phase 2 — sidebar
        navigation, module guides, and an Ask Claude assistant on the right.
      </p>
    </div>
  )
}
