import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getAsset, listReservations } from '../../../../lib/rent'
import { RentShell } from '../../RentShell'
import { AssetDetail } from './AssetDetail'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [asset, reservations] = await Promise.all([
    getAsset(ctx.tenant.id, id),
    listReservations(ctx.tenant.id, { assetId: id }, 20),
  ])
  if (!asset) notFound()

  return (
    <RentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="assets">
      <AssetDetail asset={asset} reservations={reservations} />
    </RentShell>
  )
}
