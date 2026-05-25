import { NextResponse } from 'next/server'
import { listOpenJobs } from '../../../../lib/recruitment'

// Public endpoint — no auth required. Tenant identified by query param.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant')
  if (!tenantId) return NextResponse.json({ error: 'Tenant wajib diisi.' }, { status: 400 })
  const jobs = await listOpenJobs(tenantId)
  return NextResponse.json({ jobs })
}
