import Link from 'next/link'

const SCOPES = [
  { scope: 'portal_dashboard', label: 'Dashboard Portal', description: 'Halaman utama setelah login pelanggan' },
  { scope: 'portal_help_home', label: 'Pusat Bantuan', description: 'Halaman daftar kategori Knowledge Base di portal' },
]

export default function PortalAdminPage() {
  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Portal Admin</span>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          Editor Layout Portal
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
          Kustomisasi tampilan portal pelanggan menggunakan blok konten yang dapat disusun.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        {SCOPES.map((s) => (
          <Link
            key={s.scope}
            href={`/portal-admin/layouts/${s.scope}`}
            style={{
              padding: 'var(--s-4) var(--s-5)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            <div style={{ font: '600 15px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{s.label}</div>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>{s.description}</div>
            <div style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-3)', marginTop: 8 }}>{s.scope}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
