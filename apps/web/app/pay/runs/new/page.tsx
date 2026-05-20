import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { PayShell } from '../../PayShell'
import { NewPayRunForm } from './NewPayRunForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewPayRunPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  return (
    <PayShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="runs"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Pay Run Baru</h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
          Pilih periode penggajian. Centang &quot;Isi otomatis dari karyawan aktif&quot; untuk membuat payslip kosong per karyawan, lalu lengkapi komponen di halaman detail.
        </p>
        <NewPayRunForm />
      </div>
    </PayShell>
  )
}
