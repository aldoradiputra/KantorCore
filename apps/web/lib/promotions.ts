import { eq, and, sql, lte, gte, desc } from 'drizzle-orm'
import { withTenant } from './db'
import { promotions, vouchers, promotionUses } from '@kantorcore/db'
import type {
  Promotion, NewPromotion, DiscountType, PromoStatus,
  Voucher, NewVoucher, PromotionUse,
} from '@kantorcore/db'

export type { Promotion, Voucher, PromotionUse, DiscountType, PromoStatus }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minor currency units → formatted IDR */
export function formatIDR(minor: number): string {
  return 'Rp ' + (minor / 100).toLocaleString('id-ID', { minimumFractionDigits: 0 })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── Promotion CRUD ────────────────────────────────────────────────────────────

export async function listPromotions(
  tenantId: string,
  opts?: { status?: PromoStatus; search?: string },
) {
  return withTenant(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(promotions)
      .where(
        opts?.status
          ? and(
              eq(promotions.tenantId, tenantId),
              eq(promotions.status, opts.status),
            )
          : eq(promotions.tenantId, tenantId),
      )
      .orderBy(desc(promotions.priority), desc(promotions.createdAt))
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      return rows.filter((r) => r.name.toLowerCase().includes(q))
    }
    return rows
  })
}

export async function getPromotion(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .select()
      .from(promotions)
      .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)))
    return row ?? null
  })
}

export async function createPromotion(tenantId: string, data: Omit<NewPromotion, 'tenantId'>) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .insert(promotions)
      .values({ ...data, tenantId })
      .returning()
    return row!
  })
}

export async function updatePromotion(
  tenantId: string,
  id: string,
  patch: Partial<Omit<NewPromotion, 'tenantId' | 'id' | 'createdAt'>>,
) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .update(promotions)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)))
      .returning()
    return row ?? null
  })
}

export async function deletePromotion(tenantId: string, id: string) {
  return withTenant(tenantId, async (db) => {
    await db
      .delete(promotions)
      .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)))
  })
}

// ── Promotion evaluation ──────────────────────────────────────────────────────

export interface OrderContext {
  contactId?: string | null
  lines: Array<{ productId?: string | null; categoryId?: string | null; qty: number; unitPrice: number }>
}

interface AppliedDiscount {
  promotionId: string
  promotionName: string
  discountMinor: number   // total discount in minor units
  description: string
}

/** Evaluate all active promotions for an order and return applicable discounts. */
export async function evaluatePromotions(
  tenantId: string,
  order: OrderContext,
): Promise<AppliedDiscount[]> {
  const today = todayStr()
  const active = await withTenant(tenantId, async (db) => {
    return db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.tenantId, tenantId),
          eq(promotions.status, 'active'),
        ),
      )
      .orderBy(desc(promotions.priority))
  })

  const results: AppliedDiscount[] = []
  const orderValueMinor = order.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  for (const promo of active) {
    if (promo.validFrom && promo.validFrom > today) continue
    if (promo.validTo && promo.validTo < today) continue

    const cond = (promo.conditions ?? {}) as Record<string, unknown>

    // Contact filter
    if (
      cond.customer_ids &&
      Array.isArray(cond.customer_ids) &&
      cond.customer_ids.length > 0 &&
      !cond.customer_ids.includes(order.contactId)
    ) continue

    // Order value filter
    if (typeof cond.min_order_value === 'number' && orderValueMinor < cond.min_order_value) continue
    if (typeof cond.max_order_value === 'number' && orderValueMinor > cond.max_order_value) continue

    // Product / category filter
    const productIds = Array.isArray(cond.product_ids) ? cond.product_ids as string[] : []
    const categoryIds = Array.isArray(cond.category_ids) ? cond.category_ids as string[] : []
    if (productIds.length > 0 || categoryIds.length > 0) {
      const matchedLines = order.lines.filter(
        (l) =>
          (l.productId && productIds.includes(l.productId)) ||
          (l.categoryId && categoryIds.includes(l.categoryId)),
      )
      if (matchedLines.length === 0) continue
    }

    const discount = computeDiscount(promo, order, orderValueMinor)
    if (discount > 0) {
      results.push({
        promotionId: promo.id,
        promotionName: promo.name,
        discountMinor: discount,
        description: discountLabel(promo),
      })
    }
  }

  return results
}

function computeDiscount(promo: Promotion, order: OrderContext, orderValueMinor: number): number {
  const cfg = (promo.discountConfig ?? {}) as Record<string, unknown>

  switch (promo.discountType) {
    case 'percentage': {
      const pct = typeof cfg.percent === 'number' ? cfg.percent : 0
      return Math.round(orderValueMinor * pct / 100)
    }
    case 'fixed_amount': {
      return typeof cfg.amount === 'number' ? Math.min(cfg.amount, orderValueMinor) : 0
    }
    case 'tiered': {
      const tiers = Array.isArray(cfg.tiers) ? cfg.tiers as Array<{min_qty: number; percent: number}> : []
      const totalQty = order.lines.reduce((s, l) => s + l.qty, 0)
      // find highest qualifying tier
      let pct = 0
      for (const t of tiers) {
        if (totalQty >= t.min_qty && t.percent > pct) pct = t.percent
      }
      return Math.round(orderValueMinor * pct / 100)
    }
    case 'bogo': {
      // buy N get M at get_percent% off
      const buyQty = typeof cfg.buy_qty === 'number' ? cfg.buy_qty : 1
      const getQty = typeof cfg.get_qty === 'number' ? cfg.get_qty : 1
      const getPct = typeof cfg.get_percent === 'number' ? cfg.get_percent : 100
      const totalQty = order.lines.reduce((s, l) => s + l.qty, 0)
      const sets = Math.floor(totalQty / (buyQty + getQty))
      if (sets === 0) return 0
      // Cheapest eligible unit price
      const cheapestUnitPrice = Math.min(...order.lines.map((l) => l.unitPrice))
      return Math.round(sets * getQty * cheapestUnitPrice * getPct / 100)
    }
    case 'bundle': {
      const bundlePrice = typeof cfg.bundle_price === 'number' ? cfg.bundle_price : 0
      return Math.max(0, orderValueMinor - bundlePrice)
    }
    default:
      return 0
  }
}

function discountLabel(promo: Promotion): string {
  const cfg = (promo.discountConfig ?? {}) as Record<string, unknown>
  switch (promo.discountType) {
    case 'percentage':   return `${cfg.percent ?? 0}% diskon`
    case 'fixed_amount': return `Diskon ${formatIDR(Number(cfg.amount ?? 0))}`
    case 'tiered':       return 'Diskon bertingkat berdasarkan jumlah'
    case 'bogo':         return `Beli ${cfg.buy_qty ?? 1} Gratis ${cfg.get_qty ?? 1}`
    case 'bundle':       return `Harga bundle ${formatIDR(Number(cfg.bundle_price ?? 0))}`
    default:             return 'Diskon'
  }
}

// ── Voucher CRUD ──────────────────────────────────────────────────────────────

export async function listVouchers(
  tenantId: string,
  opts?: { type?: 'code' | 'gift_card'; contactId?: string; search?: string },
) {
  return withTenant(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(vouchers)
      .where(
        opts?.type
          ? and(eq(vouchers.tenantId, tenantId), eq(vouchers.voucherType, opts.type))
          : eq(vouchers.tenantId, tenantId),
      )
      .orderBy(desc(vouchers.createdAt))
    let filtered = rows
    if (opts?.contactId) filtered = filtered.filter((r) => r.contactId === opts.contactId)
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      filtered = filtered.filter((r) => r.code.toLowerCase().includes(q))
    }
    return filtered
  })
}

export async function getVoucherByCode(tenantId: string, code: string) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.tenantId, tenantId), eq(vouchers.code, code.toUpperCase().trim())))
    return row ?? null
  })
}

export interface VoucherValidation {
  valid: boolean
  reason?: string
  voucher?: Voucher
  discountMinor?: number
}

export async function validateVoucher(
  tenantId: string,
  code: string,
  orderValueMinor: number,
): Promise<VoucherValidation> {
  const voucher = await getVoucherByCode(tenantId, code)
  if (!voucher) return { valid: false, reason: 'Kode voucher tidak ditemukan.' }

  const today = todayStr()
  if (voucher.validFrom && voucher.validFrom > today)
    return { valid: false, reason: 'Voucher belum berlaku.' }
  if (voucher.validTo && voucher.validTo < today)
    return { valid: false, reason: 'Voucher sudah kadaluarsa.' }
  if (voucher.maxUses !== null && voucher.usageCount >= (voucher.maxUses ?? Infinity))
    return { valid: false, reason: 'Voucher sudah mencapai batas penggunaan.' }

  // Gift card: discount = min(balance, orderValue)
  if (voucher.voucherType === 'gift_card') {
    const balance = voucher.balance ?? 0
    if (balance <= 0) return { valid: false, reason: 'Saldo gift card kosong.' }
    return { valid: true, voucher, discountMinor: Math.min(balance, orderValueMinor) }
  }

  // Promo voucher
  let discountMinor = 0
  if (voucher.discountOverrideAmt !== null) {
    discountMinor = Math.min(voucher.discountOverrideAmt!, orderValueMinor)
  } else if (voucher.discountOverridePct !== null) {
    discountMinor = Math.round(orderValueMinor * voucher.discountOverridePct! / 100)
  } else if (voucher.promotionId) {
    const promo = await getPromotion(tenantId, voucher.promotionId)
    if (promo) discountMinor = computeDiscount(promo, { lines: [] }, orderValueMinor)
  }

  return { valid: true, voucher, discountMinor }
}

export async function createVoucher(tenantId: string, data: Omit<NewVoucher, 'tenantId'>) {
  return withTenant(tenantId, async (db) => {
    const [row] = await db
      .insert(vouchers)
      .values({
        ...data,
        tenantId,
        code: (data.code as string).toUpperCase().trim(),
      })
      .returning()
    return row!
  })
}

/** Generate N unique random codes and insert them all. */
export async function batchCreateVouchers(
  tenantId: string,
  base: Omit<NewVoucher, 'tenantId' | 'code'>,
  count: number,
): Promise<Voucher[]> {
  const codes = generateCodes(count)
  return withTenant(tenantId, async (db) => {
    const rows = await db
      .insert(vouchers)
      .values(codes.map((code) => ({ ...base, tenantId, code })))
      .returning()
    return rows
  })
}

function generateCodes(n: number): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codes = new Set<string>()
  while (codes.size < n) {
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    codes.add(code)
  }
  return [...codes]
}

/** Issue a gift card. Returns the new voucher. */
export async function issueGiftCard(
  tenantId: string,
  opts: {
    contactId?: string | null
    amountMinor: number
    validTo?: string | null
    notes?: string | null
    createdBy?: string | null
  },
): Promise<Voucher> {
  const code = generateCodes(1)[0]!
  return createVoucher(tenantId, {
    code,
    voucherType: 'gift_card',
    initialBalance: opts.amountMinor,
    balance: opts.amountMinor,
    contactId: opts.contactId ?? null,
    validTo: opts.validTo ?? null,
    notes: opts.notes ?? null,
    createdBy: opts.createdBy ?? null,
  })
}

/** Redeem a voucher/gift card — increments usage and deducts balance. */
export async function redeemVoucher(
  tenantId: string,
  voucherId: string,
  discountApplied: number,
) {
  return withTenant(tenantId, async (db) => {
    const [v] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, voucherId), eq(vouchers.tenantId, tenantId)))
    if (!v) return

    const patch: Partial<Voucher> = { usageCount: v.usageCount + 1 }
    if (v.voucherType === 'gift_card' && v.balance !== null) {
      patch.balance = Math.max(0, v.balance - discountApplied)
    }
    await db
      .update(vouchers)
      .set(patch)
      .where(eq(vouchers.id, voucherId))
  })
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function recordPromotionUse(
  tenantId: string,
  data: {
    promotionId?: string | null
    voucherId?: string | null
    soId?: string | null
    contactId?: string | null
    discountGiven: number
  },
) {
  return withTenant(tenantId, async (db) => {
    await db.insert(promotionUses).values({ ...data, tenantId })
  })
}

export async function listPromotionUses(
  tenantId: string,
  opts?: { promotionId?: string; soId?: string; limit?: number },
) {
  return withTenant(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(promotionUses)
      .where(
        opts?.promotionId
          ? and(
              eq(promotionUses.tenantId, tenantId),
              eq(promotionUses.promotionId, opts.promotionId),
            )
          : eq(promotionUses.tenantId, tenantId),
      )
      .orderBy(desc(promotionUses.appliedAt))
      .limit(opts?.limit ?? 200)
    return rows
  })
}
