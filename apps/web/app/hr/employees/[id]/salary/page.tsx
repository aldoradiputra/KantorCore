import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { getEmployee } from '../../../../../lib/hr'
import { getEmployeeSalarySettings } from '../../../../../lib/payroll'
import { HRShell } from '../../../HRShell'
import { SalarySettingsForm } from './SalarySettingsForm'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function EmployeeSalaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const employee = await getEmployee(ctx.tenant.id, id)
  if (!employee) notFound()

  const settings = await getEmployeeSalarySettings(ctx.tenant.id, id)

  return (
    <HRShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="employees"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 680 }}>
        <div
          style={{
            font: '12px/1 var(--font-sans)',
            color: 'var(--fg-3)',
            marginBottom: 'var(--s-3)',
          }}
        >
          <Link
            href="/hr/employees"
            style={{ color: 'var(--fg-3)', textDecoration: 'none' }}
          >
            Karyawan
          </Link>
          {' › '}
          <Link
            href={`/hr/employees/${id}`}
            style={{ color: 'var(--fg-3)', textDecoration: 'none' }}
          >
            {employee.name}
          </Link>
          {' › Pengaturan Gaji'}
        </div>
        <h1
          style={{
            font: '600 20px/1.2 var(--font-sans)',
            color: 'var(--fg-1)',
            margin: '0 0 var(--s-5)',
          }}
        >
          Pengaturan Gaji — {employee.name}
        </h1>
        <SalarySettingsForm employeeId={id} initialSettings={settings} />
      </div>
    </HRShell>
  )
}
