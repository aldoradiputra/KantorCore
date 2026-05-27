import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getContactWithInheritance, getContactHierarchy, listBankAccounts } from '../../../lib/contacts'
import { listTenantMembers as listMembers } from '../../../lib/proj'
import ContactDetail from './ContactDetail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: 'Detail Kontak' }
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id } = await params

  const [contactData, hierarchy, banks, members] = await Promise.all([
    getContactWithInheritance(ctx.tenant.id, id),
    getContactHierarchy(ctx.tenant.id, id),
    listBankAccounts(ctx.tenant.id, id),
    listMembers(ctx.tenant.id),
  ])

  if (!contactData) notFound()

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <ContactDetail
      contactData={contactData}
      hierarchy={hierarchy!}
      banks={banks}
      members={members}
      canEdit={isAdmin}
    />
  )
}
