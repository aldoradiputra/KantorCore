import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { getModel, listFields, listFieldTypes } from '../../../../../lib/platform/registry'
import { SettingsShell } from '../../../SettingsShell'
import ModelFieldsPanel from './ModelFieldsPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ModelDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const decodedKey = decodeURIComponent(key)
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const def = await getModel(decodedKey)
  if (!def) notFound()
  const [allFields, fieldTypes] = await Promise.all([
    listFields(decodedKey, ctx.tenant.id),
    listFieldTypes(),
  ])

  return (
    <SettingsShell
      activeSection="platform-models"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 800, width: '100%' }}>
          <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>
            <Link href="/settings/platform/models" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
              ← Model &amp; Custom Fields
            </Link>
          </div>
          <h2 style={{ margin: '4px 0 0' }}>{def.model.label}</h2>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 var(--s-5)', maxWidth: 600 }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{def.model.key}</span> — tabel{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{def.model.schemaName}.{def.model.tableName}</span>.
            Field sistem tidak dapat diubah; field kustom hanya berlaku untuk workspace ini.
          </p>

          <ModelFieldsPanel
            modelKey={def.model.key}
            fields={allFields}
            fieldTypes={fieldTypes}
          />
        </div>
      </div>
    </SettingsShell>
  )
}
