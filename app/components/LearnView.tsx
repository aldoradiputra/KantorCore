'use client'

export default function LearnView() {
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
        background: 'var(--teal-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--teal)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m10 8 6 4-6 4V8z" fill="currentColor" />
        </svg>
      </div>
      <h2 style={{ color: 'var(--navy)', fontSize: 18, fontWeight: 700 }}>Learn</h2>
      <p style={{ fontSize: 13, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        Tutorials, guided walkthroughs, and certification courses for end users
        and admins. Lands as part of the e-Learning module in Phase 3.
      </p>
    </div>
  )
}
