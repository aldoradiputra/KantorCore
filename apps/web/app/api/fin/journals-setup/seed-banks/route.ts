import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { INDONESIAN_BANK_SEED } from '../../../../../lib/finance-journals'
import { getDb } from '../../../../../lib/db'
import { indonesianBanks } from '@kantorcore/db'
import { eq } from 'drizzle-orm'

export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  let seeded = 0
  for (const bank of INDONESIAN_BANK_SEED) {
    const existing = await db.select({ code: indonesianBanks.code }).from(indonesianBanks).where(eq(indonesianBanks.code, bank.code)).limit(1)
    if (existing.length === 0) {
      await db.insert(indonesianBanks).values({ code: bank.code, name: bank.name, swiftCode: bank.swiftCode ?? null, active: true })
      seeded++
    }
  }
  return NextResponse.json({ seeded })
}
