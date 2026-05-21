import { redirect } from 'next/navigation'
import { getCurrentPortalSession } from '../../lib/portal-auth'

export default async function PortalIndex() {
  const session = await getCurrentPortalSession()
  if (session) redirect('/portal/dashboard')
  redirect('/portal/sign-in')
}
