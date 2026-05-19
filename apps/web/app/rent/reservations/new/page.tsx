import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAssets, listRentCustomers } from '../../../../lib/rent'
import { RentShell } from '../../RentShell'
import { NewReservationForm } from './NewReservationForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [assets, customers, sp] = await Promise.all([
    listAssets(ctx.tenant.id, { status: 'available' }),
    listRentCustomers(ctx.tenant.id),
    searchParams,
  ])

  return (
    <RentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="reservations">
      <NewReservationForm assets={assets} customers={customers} presetAssetId={sp.assetId} />
    </RentShell>
  )
}
