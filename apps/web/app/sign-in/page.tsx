import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import SignInForm from './SignInForm'

export const metadata = { title: 'Masuk · KantorCore' }

export default async function SignInPage() {
  const session = await getCurrentSession()
  if (session) redirect('/')
  return <SignInForm />
}
