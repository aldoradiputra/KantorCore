import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SettingsShell } from '../SettingsShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function BillingPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  return (
    <SettingsShell activeSection="billing" isAdmin={isAdmin} tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} userEmail={session.user.email}>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ margin: '0 0 var(--s-2)' }}>Langganan</h2>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '0 0 var(--s-5)' }}>
            Manajemen paket, jumlah seat, dan riwayat invoice.
          </p>

          {/* Current plan card */}
          <div style={{ padding: 'var(--s-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-4)' }}>
              <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Paket Saat Ini</div>
              <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '3px 8px', borderRadius: 999 }}>
                Early Access
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-4)' }}>
              {[
                { label: 'Paket', value: 'KantorCore Starter' },
                { label: 'Seat', value: 'Tidak terbatas (Early Access)' },
                { label: 'Renewal', value: 'Dikelola manual' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 'var(--s-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s-4)' }}>
            <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 8 }}>Yang akan tersedia</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Pilih paket: Starter / Growth / Enterprise',
                'Manajemen seat — tambah / kurangi pengguna',
                'Invoice PDF otomatis tiap bulan',
                'Integrasi Midtrans / VA BCA untuk pembayaran IDR',
                'Riwayat transaksi lengkap',
              ].map((f) => (
                <li key={f} style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>{f}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'inline-flex', font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--fg-3)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4 }}>
            Billing engine — IS-PLAT Phase 2
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}
