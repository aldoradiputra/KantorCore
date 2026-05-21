import 'server-only'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { invoices, bills, employees } from '@kantorcore/db'
import { withTenant } from './db'

/**
 * Spec declaring one downstream table that mirrors values from a source record.
 * freeze: when the target row's status column is in one of these values, skip sync
 * (preserves immutable audit trail on confirmed/paid documents).
 */
interface RelatedSpec {
  table: typeof invoices | typeof bills | typeof employees
  fkCol: string
  mirror: Record<string, string> // targetCol → sourceField
  freeze?: { col: string; values: string[] }
}

const CONTACT_SPECS: RelatedSpec[] = [
  {
    table: invoices,
    fkCol: 'contactId',
    mirror: { customerName: 'name', customerEmail: 'email' },
    freeze: { col: 'status', values: ['confirmed', 'paid', 'cancelled'] },
  },
  {
    table: bills,
    fkCol: 'contactId',
    mirror: { vendorName: 'name' },
    freeze: { col: 'status', values: ['confirmed', 'paid', 'cancelled'] },
  },
  {
    table: employees,
    fkCol: 'contactId',
    mirror: { name: 'name', email: 'email' },
    // no freeze — employee records are always live
  },
]

/**
 * Called after a contact is updated. Propagates changed fields to all
 * downstream tables that reference the contact via a FK, skipping rows
 * whose status is frozen (confirmed/paid documents preserve their snapshot).
 */
export async function syncContactRelated(
  tenantId: string,
  contactId: string,
  source: { name: string; email: string | null },
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    for (const spec of CONTACT_SPECS) {
      const patch: Record<string, unknown> = {}
      for (const [targetCol, sourceField] of Object.entries(spec.mirror)) {
        patch[targetCol] = source[sourceField as keyof typeof source] ?? null
      }

      // Build WHERE: FK matches AND (no freeze OR status not in frozen list)
      const t = spec.table as any
      const fkExpr = eq(t[spec.fkCol], contactId)
      const tenantExpr = eq(t.tenantId, tenantId)

      if (spec.freeze) {
        const frozenCol = t[spec.freeze.col]
        await tx
          .update(spec.table as any)
          .set(patch)
          .where(
            and(
              tenantExpr,
              fkExpr,
              sql`${frozenCol} NOT IN (${sql.join(
                spec.freeze.values.map((v) => sql`${v}`),
                sql`, `,
              )})`,
            ),
          )
      } else {
        await tx
          .update(spec.table as any)
          .set(patch)
          .where(and(tenantExpr, fkExpr))
      }
    }
  })
}
