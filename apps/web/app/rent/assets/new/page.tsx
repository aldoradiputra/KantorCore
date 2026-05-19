import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { RentShell } from '../../RentShell'
import { NewAssetForm } from './NewAssetForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewAssetPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  return (
    <RentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="assets">
      <NewAssetForm />
    </RentShell>
  )
}
