import { Button } from '@kantr/ui'

type Section = {
  label: string
  items: { label: string; href: string; soon?: boolean }[]
}

const NAV: Section[] = [
  {
    label: 'Pengenalan',
    items: [
      { label: 'Apa itu Kantr', href: '#', soon: true },
      { label: 'Filosofi produk', href: '#', soon: true },
      { label: 'Posisi Indonesia', href: '#', soon: true },
    ],
  },
  {
    label: 'Memulai',
    items: [
      { label: 'Daftar akun', href: '#', soon: true },
      { label: 'Setup awal', href: '#', soon: true },
      { label: 'Impor data', href: '#', soon: true },
    ],
  },
  {
    label: 'Modul',
    items: [
      { label: 'HR & Karyawan', href: '#', soon: true },
      { label: 'Keuangan', href: '#', soon: true },
      { label: 'Penjualan & CRM', href: '#', soon: true },
      { label: 'Pengadaan & Inventori', href: '#', soon: true },
    ],
  },
  {
    label: 'Pengembang',
    items: [
      { label: 'API Reference', href: '#', soon: true },
      { label: 'Tool Registry', href: '#', soon: true },
      { label: 'Webhooks', href: '#', soon: true },
    ],
  },
]

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header
        style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          Kantr <span style={{ color: 'var(--fg-3)', fontWeight: 500 }}>· docs</span>
        </span>
        <a href="https://kantr.com" style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
          ← Beranda
        </a>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: 'var(--sidebar-w)',
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 'var(--s-5) var(--s-4)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {NAV.map((section) => (
            <div key={section.label} style={{ marginBottom: 'var(--s-5)' }}>
              <div className="t-micro" style={{ marginBottom: 'var(--s-3)' }}>
                {section.label}
              </div>
              {section.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--r-sm)',
                    font: '500 13px/1 var(--font-sans)',
                    color: item.soon ? 'var(--fg-3)' : 'var(--fg-2)',
                    cursor: item.soon ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>{item.label}</span>
                  {item.soon && (
                    <span
                      style={{
                        font: '700 9px/1 var(--font-sans)',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        color: 'var(--fg-3)',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        padding: '3px 5px',
                        borderRadius: 4,
                      }}
                    >
                      Soon
                    </span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Content */}
        <article
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--s-7) var(--content-gutter)',
            maxWidth: 760,
          }}
        >
          <span className="t-micro" style={{ marginBottom: 'var(--s-3)', display: 'block' }}>
            Pengenalan
          </span>
          <h1 style={{ marginBottom: 'var(--s-4)' }}>Dokumentasi Kantr</h1>
          <p className="t-body-l" style={{ marginBottom: 'var(--s-5)' }}>
            Selamat datang. Dokumentasi lengkap sedang disiapkan dan akan rilis
            bersama versi 1.0. Sementara itu, lihat roadmap publik untuk fitur
            yang sedang dibangun.
          </p>

          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: 'var(--s-5)',
              background: 'var(--surface)',
              marginBottom: 'var(--s-5)',
            }}
          >
            <h3 style={{ marginBottom: 'var(--s-3)' }}>Status pra-rilis</h3>
            <p style={{ marginBottom: 'var(--s-4)' }}>
              Kantr sedang dibangun. Dokumentasi resmi ini akan dipindahkan ke
              IS-KMS — modul Knowledge Management milik Kantr sendiri — ketika
              modul tersebut rilis di Fase 2. Sampai saat itu, halaman ini
              menjadi tempat singgah.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <a href="https://roadmap.kantr.com">
                <Button variant="primary" size="md">
                  Lihat Roadmap
                </Button>
              </a>
              <a href="https://kantr.com">
                <Button variant="secondary" size="md">
                  Beranda Kantr
                </Button>
              </a>
            </div>
          </div>

          <h2 style={{ marginTop: 'var(--s-7)', marginBottom: 'var(--s-3)' }}>
            Apa yang akan tersedia
          </h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'grid',
              gap: 'var(--s-2)',
            }}
          >
            <li>· Panduan setup awal dan impor data dari Accurate, Zahir, Excel.</li>
            <li>· Referensi setiap modul (HR, Keuangan, Penjualan, dan seterusnya).</li>
            <li>· Dokumentasi pengembang: API, webhook, Tool Registry, MCP server.</li>
            <li>· Pola integrasi dengan BPJS, DJP CoreTax, QRIS, PrivyID, Peruri.</li>
          </ul>
        </article>
      </div>

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
        <span>Dokumentasi v0.0.1 · pra-rilis</span>
      </footer>
    </main>
  )
}
