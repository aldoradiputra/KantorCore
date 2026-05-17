import { Button } from '@kantr/ui'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Topbar */}
      <header
        style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--content-gutter)',
        }}
      >
        <span
          style={{
            font: '700 18px/1 var(--font-sans)',
            color: 'var(--navy)',
            letterSpacing: '-0.2px',
          }}
        >
          Kantr
        </span>
      </header>

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--s-7) var(--content-gutter)',
          textAlign: 'center',
        }}
      >
        <span
          className="t-micro"
          style={{ marginBottom: 'var(--s-4)' }}
        >
          Segera hadir
        </span>

        <h1
          style={{
            font: '800 56px/1.05 var(--font-sans)',
            letterSpacing: '-1.4px',
            color: 'var(--fg-1)',
            maxWidth: 880,
            marginBottom: 'var(--s-5)',
          }}
        >
          Sistem operasi korporat untuk Indonesia.
        </h1>

        <p
          style={{
            font: '400 18px/1.55 var(--font-sans)',
            color: 'var(--fg-2)',
            maxWidth: 640,
            marginBottom: 'var(--s-7)',
          }}
        >
          Sesederhana Odoo, sekuat SAP. Terintegrasi natif dengan BPJS,
          DJP CoreTax, QRIS, dan PrivyID — dibangun di Indonesia untuk bisnis
          Indonesia.
        </p>

        <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
          <Button variant="primary" size="lg">
            Mulai Gratis
          </Button>
          <a href="https://roadmap.kantr.com">
            <Button variant="secondary" size="lg">
              Lihat Roadmap
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: 'var(--s-4) var(--content-gutter)',
          font: '400 12px/1.4 var(--font-sans)',
          color: 'var(--fg-3)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>© 2026 Kantr</span>
        <span>v0.0.1 · Pre-launch</span>
      </footer>
    </main>
  )
}
