import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listProjects, createProject } from '../../../../lib/proj'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const projects = await listProjects(result.ctx.tenant.id)
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { slug, key, name, description } = body as Record<string, unknown>
  if (typeof slug !== 'string' || typeof key !== 'string' || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const created = await createProject({
    tenantId: result.ctx.tenant.id,
    userId: result.ctx.session.user.id,
    slug,
    key,
    name,
    description: typeof description === 'string' ? description : undefined,
  })
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 })
  return NextResponse.json({ project: created.project })
}
