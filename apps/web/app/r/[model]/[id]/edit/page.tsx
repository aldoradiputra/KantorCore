import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { AppShell } from '../../../../../components/AppShell'
import { getModel, listFields } from '../../../../../lib/platform/registry'
import { getRecord } from '../../../../../lib/platform/records'
import RecordForm from '../../../../../components/platform/RecordForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ model: string; id: string }>
}) {
  const { model, id } = await params
  const modelKey = decodeURIComponent(model)
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const def = await getModel(modelKey, ctx.tenant.id)
  if (!def) notFound()
  const [fields, record] = await Promise.all([
    listFields(modelKey, ctx.tenant.id),
    getRecord(ctx.tenant.id, modelKey, id),
  ])
  if (!record) notFound()

  // Map system column names back to field keys for initial form values
  const initialSystem: Record<string, unknown> = {}
  for (const f of fields.filter((x) => x.isSystem && x.columnName)) {
    initialSystem[f.key] = (record as Record<string, unknown>)[f.columnName!]
  }

  return (
    <AppShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeModule={null}>
      <div style={{ padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 720, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            <Link href={`/r/${encodeURIComponent(modelKey)}/${id}`} style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
              ← Kembali
            </Link>
          </div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Edit {def.model.label}
          </h1>
          <RecordForm
            modelKey={modelKey}
            fields={fields}
            initialSystem={initialSystem}
            initialCustom={record.custom}
            recordId={id}
            mode="edit"
          />
        </div>
      </div>
    </AppShell>
  )
}
