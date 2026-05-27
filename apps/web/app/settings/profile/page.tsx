import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  return (
    <ProfileForm
      userId={session.user.id}
      name={session.user.name}
      email={session.user.email}
    />
  )
}
