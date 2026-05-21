# IS-PROMO: Sales Promotions & Discounts (Phase 2)

## Overview
Rules-based promotion engine for sales orders, gift cards, and voucher codes. Conditions-driven discounts with audit trail, communication integration via IS-TRIG, and extensible code formulas for complex pricing logic.

## Feature Code
`IS-PROMO` — Sales Promotions, Discounts, Gift Cards, Vouchers

## Phase
**Phase 2** (Post-Phase 1 complete; depends on IS-SALES, IS-CONTACTS, IS-TRIG)

## User Stories

### Core Promotions
- **USR-001**: As a sales manager, I can create a promotion rule (name, conditions, discount type, period) so recurring sales are automated
- **USR-002**: As a sales manager, I can set conditions (customer segment, product/category, order value range, qty, date range) so promotions target specific scenarios
- **USR-003**: As a sales manager, I can choose discount types: fixed amount, percentage, tiered volume, BOGO, bundle so discounts suit different strategies
- **USR-004**: As a sales manager, I can enable/disable promotions without deleting them so I can pause and resume campaigns
- **USR-005**: As a system, I automatically apply active promotions to sales orders at line-item level so manual work is eliminated
- **USR-006**: As a sales rep, I can see applied promotions and discount amounts on SO detail so transparency is clear
- **USR-007**: As a sales manager, I can view promotion usage audit (SO #, customer, discount given, timestamp) so ROI is tracked

### Voucher Codes
- **USR-008**: As a sales manager, I can generate/import voucher codes (batch or single) with expiry date and max usage so campaigns are controlled
- **USR-009**: As a sales rep, I can enter a voucher code on SO creation so customer discount is redeemed
- **USR-010**: As a system, I validate code (active, not expired, usage < max) and apply discount on confirmation so fraud is prevented
- **USR-011**: As a sales manager, I can view voucher report (code, issued, redeemed, remaining) so campaign performance is visible

### Gift Cards
- **USR-012**: As a sales manager, I can issue a gift card (amount, recipient, note) so customer receives prepaid credit
- **USR-013**: As a customer (via portal), I can view my gift card balance and redeem on checkout so UX is self-serve
- **USR-014**: As a system, I track gift card balance as Account prepayment so accounting reflects reality
- **USR-015**: As a sales manager, I can void/adjust gift card balance (e.g., refund, expiry) so exceptions are handled

### Communication
- **USR-016**: As a sales manager, I can attach a communication rule to a promotion (email template, WhatsApp message) so customers are notified
- **USR-017**: As a system, I fire `promotion.created` / `promotion.active` / `voucher.issued` events to IS-TRIG so chat/email/SMS notifications are automated
- **USR-018**: As a sales manager, I can schedule bulk email/WhatsApp campaign announcing a promotion so reach is maximized

## Technical Scope

### Database Schema (Migration)
```sql
-- promo schema
CREATE SCHEMA promo;

-- Promotion rules
CREATE TABLE promo.promotions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  discount_type ENUM ('fixed_amount', 'percentage', 'tiered', 'bogo', 'bundle'),
  discount_config JSONB NOT NULL, -- { amount, percent, tiers: [{qty, discount}], buy_qty, get_qty, ... }
  conditions JSONB NOT NULL, -- { customer_segment_ids, product_ids, category_ids, min_value, max_value, date_range: {start, end} }
  custom_formula TEXT, -- Optional JS expression for complex logic
  status ENUM ('active', 'inactive', 'archived'),
  valid_from DATE, valid_to DATE,
  priority INT DEFAULT 0, -- Higher = applied first
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voucher codes
CREATE TABLE promo.vouchers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  promotion_id UUID REFERENCES promo.promotions(id),
  code TEXT NOT NULL UNIQUE,
  discount_amount INT, -- Override promotion if set
  max_uses INT, usage_count INT DEFAULT 0,
  valid_from DATE, valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotion application audit
CREATE TABLE promo.promotion_uses (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  promotion_id UUID REFERENCES promo.promotions(id),
  voucher_id UUID REFERENCES promo.vouchers(id),
  so_id UUID NOT NULL REFERENCES sales.sales_orders(id),
  so_line_id UUID REFERENCES sales.so_lines(id),
  discount_amount INT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift cards (stored as special contact + account prepayment)
-- No new table — contact.type = 'gift_card', linked Account with prepayment balance
```

### API Endpoints
```
GET/POST   /api/promo/promotions
PATCH/DELETE /api/promo/promotions/[id]
POST       /api/promo/promotions/[id]/activate
POST       /api/promo/promotions/[id]/deactivate

GET/POST   /api/promo/vouchers
POST       /api/promo/vouchers/batch-generate (code pattern, qty, amounts)
GET        /api/promo/vouchers/[code]/validate (check active, expiry, usage)
GET        /api/promo/vouchers/report

GET        /api/promo/gift-cards
POST       /api/promo/gift-cards (issue new)
PATCH      /api/promo/gift-cards/[id] (adjust balance)

GET        /api/promo/usage-audit (filter by promotion, voucher, SO, date range)
```

### UI Pages
```
/promo/promotions
  → List with status badges, valid period, priority
  → New/edit form: conditions builder, discount config, formula editor
  → Activate/deactivate actions, linked triggers (IS-TRIG)

/promo/vouchers
  → List with code, max_uses, usage_count, expiry
  → Batch generate modal, import CSV
  → Report: redeemed%, revenue impact

/promo/gift-cards
  → Issuance form: amount, recipient (contact name or email)
  → List: balance, recipient, status
  → Adjustment modal: void, refund, extend expiry

/promo/reports
  → Promotion ROI: discount given vs. order value/frequency
  → Voucher campaign performance
  → Gift card utilization
```

### Integration Points
- **IS-SALES**: SO creation/confirmation triggers promotion evaluation; line-item discount_amount field
- **IS-CONTACTS**: Segment conditions reference customer groups; gift card as special contact type
- **IS-FIN**: Gift card balance → Account prepayment; invoice line reconciliation with discount
- **IS-TRIG**: Fires `promotion.created`, `voucher.redeemed`, `gift_card.issued` events; templates for email/WhatsApp
- **IS-CHAT** (Phase 2): Post promotion announcements to #sales channel

### Drizzle Schema (TypeScript)
- `promotions`, `vouchers`, `promotionUses` tables exported from `@kantorcore/db`
- Types: `Promotion`, `Voucher`, `PromotionUse`, `DiscountType`

### Business Logic (`lib/promotions.ts`)
```typescript
export async function evaluatePromotions(
  tenantId: string,
  soInput: { customerId?, productIds, totalValue, date }
): Promise<PromotionMatch[]>

export async function applyPromotion(
  tenantId: string,
  soId: string,
  promotionId: string
): Promise<{ discountAmount, appliedToLines }>

export async function validateVoucher(
  tenantId: string,
  code: string
): Promise<{ ok: true; discount: number } | { ok: false; error }>

export async function issueGiftCard(
  tenantId: string,
  amount: number,
  recipientEmail: string
): Promise<{ giftCardId, balanceAccountId }>
```

### Extensibility
- **Custom Formulas**: Voucher/promotion `custom_formula` field stores JavaScript expression
  - Evaluated in sandboxed context: `{ qty, unitPrice, totalValue, customerAge, segment, ... }`
  - Example: `qty > 10 ? totalValue * 0.2 : qty > 5 ? totalValue * 0.1 : 0`
  - Drizzle-safe: use `vm2` or similar for safe eval

## Dependencies
- ✅ **IS-SALES** (SO, SO lines, SO status)
- ✅ **IS-CONTACTS** (Customer segments, contact types)
- ✅ **IS-TRIG** (Event firing, IS-TRIG rules for notifications)
- ✅ **IS-FIN** (Account prepayments for gift cards)
- (Optional) **IS-CHAT** (Channel announcements)
- (Optional) **IS-COMM** (Email/WhatsApp integration, if separate Phase 2 module)

## Acceptance Criteria
- [ ] Promotion rule CRUD works with all discount types
- [ ] Voucher code generation + validation (expiry, usage count) passes
- [ ] SO confirmation auto-evaluates active promotions + applies line-item discounts
- [ ] Gift card issuance creates Account prepayment + reduces balance on invoice payment
- [ ] Promotion/voucher/gift-card events fire to IS-TRIG; sample email template works
- [ ] Audit trail captures every discount application with SO reference
- [ ] Custom formula evaluates safely without breaking on invalid input
- [ ] Promotion priority sorting works (higher priority applied first, discount stacking prevented)
- [ ] UI form validations prevent invalid conditions (e.g., min_value > max_value)
- [ ] Reports show ROI: total discount given vs. average order uplift

## Out of Scope (Phase 3+)
- A/B testing framework for promotions
- Dynamic pricing (ML-based demand-based discounts)
- Customer loyalty points system
- Multi-currency promotion rules
- Inventory-linked promotions (e.g., "20% off if stock > 100 units")
