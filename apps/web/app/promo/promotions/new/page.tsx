import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import PromoForm from '../PromoForm'

export default async function NewPromoPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/promo/promotions')

  return (
    <div style={{ padding: 'var(--s-6)', maxWidth: 720 }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <span className="t-micro" style={{ color: 'var(--fg-3)' }}>Promosi · Baru</span>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '4px 0 0' }}>
          Buat Promosi Baru
        </h1>
      </header>
      <PromoForm />
    </div>
  )
}
