import { eq, and, desc } from 'drizzle-orm'
import { withTenant } from './db'
import { salesOrders, invoices, vouchers } from '@kantorcore/db'
import type { SalesOrder, Invoice, Voucher } from '@kantorcore/db'

/** Sales orders where the customer is this portal contact. */
export async function getMySalesOrders(tenantId: string, contactId: string): Promise<SalesOrder[]> {
  return withTenant(tenantId, async (db) => {
    return db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.contactId, contactId)))
      .orderBy(desc(salesOrders.date))
      .limit(50)
  })
}

/** Invoices billed to this portal contact. */
export async function getMyInvoices(tenantId: string, contactId: string): Promise<Invoice[]> {
  return withTenant(tenantId, async (db) => {
    return db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.contactId, contactId)))
      .orderBy(desc(invoices.date))
      .limit(50)
  })
}

/** Gift cards issued to this portal contact (or globally redeemable cards they have). */
export async function getMyGiftCards(tenantId: string, contactId: string): Promise<Voucher[]> {
  return withTenant(tenantId, async (db) => {
    return db
      .select()
      .from(vouchers)
      .where(
        and(
          eq(vouchers.tenantId, tenantId),
          eq(vouchers.voucherType, 'gift_card'),
          eq(vouchers.contactId, contactId),
        ),
      )
      .orderBy(desc(vouchers.createdAt))
  })
}
