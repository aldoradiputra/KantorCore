import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getReservation } from '../../../../lib/rent'
import { RentShell } from '../../RentShell'
import { ReservationDetail } from './ReservationDetail'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const reservation = await getReservation(ctx.tenant.id, id)
  if (!reservation) notFound()

  return (
    <RentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="reservations">
      <ReservationDetail initialReservation={reservation} />
    </RentShell>
  )
}
