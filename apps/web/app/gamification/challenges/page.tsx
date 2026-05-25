import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listChallenges } from '../../../lib/gamification'
import { listBadges } from '../../../lib/gamification'
import { GamificationShell } from '../GamificationShell'
import { ChallengesClient } from './ChallengesClient'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ChallengesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [challenges, badges] = await Promise.all([
    listChallenges(ctx.tenant.id, false),
    listBadges(ctx.tenant.id),
  ])

  return (
    <GamificationShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="challenges">
      <ChallengesClient
        initialChallenges={challenges.map((c) => ({
          ...c,
          targetValue: String(c.targetValue),
        }))}
        badges={badges}
      />
    </GamificationShell>
  )
}
