import { and, eq, ilike, or } from 'drizzle-orm'
import { channels, projects } from '@kantorcore/db'
import { withTenant } from './db'

export interface SearchHit {
  type: 'channel' | 'project'
  id: string
  label: string
  hint: string
  href: string
}

export async function searchTenant(tenantId: string, query: string): Promise<SearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const pattern = `%${q.toLowerCase()}%`

  return withTenant(tenantId, async (tx) => {
    const [channelRows, projectRows] = await Promise.all([
      tx
        .select({ id: channels.id, slug: channels.slug, name: channels.name })
        .from(channels)
        .where(
          and(
            eq(channels.tenantId, tenantId),
            or(ilike(channels.slug, pattern), ilike(channels.name, pattern)),
          ),
        )
        .limit(8),
      tx
        .select({
          id: projects.id,
          slug: projects.slug,
          name: projects.name,
          key: projects.key,
        })
        .from(projects)
        .where(
          and(
            eq(projects.tenantId, tenantId),
            or(
              ilike(projects.slug, pattern),
              ilike(projects.name, pattern),
              ilike(projects.key, pattern),
            ),
          ),
        )
        .limit(8),
    ])

    return [
      ...channelRows.map<SearchHit>((c) => ({
        type: 'channel',
        id: c.id,
        label: `#${c.slug}`,
        hint: c.name,
        href: `/chat/${c.slug}`,
      })),
      ...projectRows.map<SearchHit>((p) => ({
        type: 'project',
        id: p.id,
        label: p.name,
        hint: p.key,
        href: `/proj/${p.slug}`,
      })),
    ]
  })
}
