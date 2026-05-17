import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import SignUpForm from './SignUpForm'

export const metadata = { title: 'Daftar · Kantr' }

export default async function SignUpPage() {
  const session = await getCurrentSession()
  if (session) redirect('/')
  return <SignUpForm />
}
